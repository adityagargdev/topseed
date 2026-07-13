import { Response, NextFunction } from 'express'
import crypto from 'crypto'
import Razorpay from 'razorpay'
import prisma from '../config/prisma'
import { AuthenticatedRequest } from '../types'
import { AppError } from '../middleware/error.middleware'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

// POST /api/payments/create-order
// Creates a Razorpay order for a paid event registration.
export async function createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { eventId, partnerId } = req.body as { eventId: string; partnerId?: string }
    if (!eventId) throw new AppError('eventId is required', 400)

    const event = await prisma.tournamentEvent.findUniqueOrThrow({
      where: { id: eventId },
      include: { tournament: { select: { registrationDeadline: true } } },
    })
    if (event.status !== 'REGISTRATION_OPEN') throw new AppError('Registration is not open', 400)
    if (!event.entryFee || event.entryFee <= 0) throw new AppError('This event has no entry fee', 400)

    if (event.maxEntries !== null) {
      const count = await prisma.tournamentEntry.count({ where: { eventId } })
      if (count >= event.maxEntries) throw new AppError('This event is full', 409)
    } else if (event.tournament.registrationDeadline && new Date() > event.tournament.registrationDeadline) {
      throw new AppError('Registration deadline has passed', 400)
    }

    // Check already registered
    const player = await prisma.player.findUnique({ where: { userId: req.user!.id } })
    if (player) {
      const existing = await prisma.tournamentEntry.findUnique({
        where: { eventId_playerId: { eventId, playerId: player.id } },
      })
      if (existing) throw new AppError('Already registered for this event', 409)
    }

    // Check if a pending order already exists (idempotency: reuse it)
    const existingPayment = await prisma.payment.findFirst({
      where: { userId: req.user!.id, eventId, status: 'PENDING' },
    })
    if (existingPayment) {
      return res.json({
        orderId: existingPayment.razorpayOrderId,
        amount: existingPayment.amount,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
      })
    }

    const order = await razorpay.orders.create({
      amount: event.entryFee,
      currency: 'INR',
      receipt: `entry_${req.user!.id.slice(-6)}_${eventId.slice(-6)}`,
    })

    await prisma.payment.create({
      data: {
        userId: req.user!.id,
        eventId,
        razorpayOrderId: order.id,
        amount: event.entryFee,
        status: 'PENDING',
      },
    })

    res.json({ orderId: order.id, amount: event.entryFee, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID })
  } catch (err) {
    next(err)
  }
}

// POST /api/payments/verify
// Verifies Razorpay signature, marks payment completed, creates the entry.
export async function verifyPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, eventId, partnerId } =
      req.body as {
        razorpay_order_id: string
        razorpay_payment_id: string
        razorpay_signature: string
        eventId: string
        partnerId?: string
      }

    // 1. Verify HMAC signature
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (expected !== razorpay_signature) throw new AppError('Payment verification failed', 400)

    // 2. Find the pending Payment record
    const payment = await prisma.payment.findUnique({ where: { razorpayOrderId: razorpay_order_id } })
    if (!payment) throw new AppError('Order not found', 404)
    if (payment.userId !== req.user!.id) throw new AppError('Unauthorized', 403)
    if (payment.status === 'COMPLETED') throw new AppError('Already registered', 409)

    const event = await prisma.tournamentEvent.findUniqueOrThrow({ where: { id: payment.eventId } })

    // 3. Create the TournamentEntry + mark payment COMPLETED in one transaction
    const result = await prisma.$transaction(async (tx) => {
      const player = await tx.player.upsert({
        where: { userId: req.user!.id },
        update: {},
        create: { userId: req.user!.id },
      })

      let resolvedPartnerId: string | undefined
      if (event.eventType === 'DOUBLES') {
        if (!partnerId) throw new AppError('partnerId required for doubles', 400)
        if (partnerId === player.id) throw new AppError('Cannot partner with yourself', 400)
        await tx.player.findUniqueOrThrow({ where: { id: partnerId } })
        resolvedPartnerId = partnerId
      }

      const entry = await tx.tournamentEntry.create({
        data: { eventId: payment.eventId, playerId: player.id, partnerId: resolvedPartnerId ?? null },
      })

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'COMPLETED', razorpayPaymentId: razorpay_payment_id, entryId: entry.id },
      })

      return entry
    })

    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
}
