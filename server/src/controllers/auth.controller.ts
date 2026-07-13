import { Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../config/prisma'
import { AuthenticatedRequest } from '../types'
import { AppError } from '../middleware/error.middleware'

export async function syncUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { adminRequest: true },
    })
    res.json(user)
  } catch (err) {
    next(err)
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { adminRequest: true, playerProfile: true },
    })
    res.json(user)
  } catch (err) {
    next(err)
  }
}

const updateSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  photoURL: z.string().url().optional().nullable(),
})

export async function updateMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = updateSchema.parse(req.body)
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data,
    })
    res.json(user)
  } catch (err) {
    next(err)
  }
}

const adminRequestSchema = z.object({
  reason: z.string().min(10).max(500).optional(),
})

export async function lookupUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { email } = req.query as { email?: string }
    if (!email) throw new AppError('email query param required', 400)
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, displayName: true, email: true },
    })
    if (!user) throw new AppError('No user found with that email', 404)
    res.json(user)
  } catch (err) {
    next(err)
  }
}

export async function requestAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { reason } = adminRequestSchema.parse(req.body)
    const existing = await prisma.adminRequest.findUnique({ where: { userId: req.user!.id } })
    if (existing && existing.status === 'PENDING') {
      throw new AppError('You already have a pending admin request', 409)
    }

    const request = await prisma.adminRequest.upsert({
      where: { userId: req.user!.id },
      update: { reason, status: 'PENDING' },
      create: { userId: req.user!.id, reason },
    })
    res.status(201).json(request)
  } catch (err) {
    next(err)
  }
}
