import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import prisma from '../config/prisma'
import { AuthenticatedRequest } from '../types'
import { AppError } from '../middleware/error.middleware'

const eventSchema = z.object({
  name: z.string().min(1).max(100),
  eventType: z.enum(['SINGLES', 'DOUBLES', 'TEAM']),
  gender: z.enum(['MEN', 'WOMEN', 'MIXED', 'OPEN']).default('OPEN'),
  ageGroup: z.string().max(20).optional().nullable(),
  format: z.enum(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN']),
  maxEntries: z.number().int().positive().optional().nullable(),
  entryFee: z.number().int().min(0).optional().nullable(), // in paise
  scoringConfig: z.record(z.unknown()).optional().nullable(),
})

async function assertTournamentAdmin(tournamentId: string, userId: string, role: string) {
  const t = await prisma.tournament.findUniqueOrThrow({ where: { id: tournamentId } })
  if (t.adminId !== userId && role !== 'SUPER_ADMIN') {
    throw new AppError('You do not manage this tournament', 403)
  }
  return t
}

export async function listEvents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const events = await prisma.tournamentEvent.findMany({
      where: { tournamentId: req.params.id },
      include: { _count: { select: { entries: true, matches: true } } },
      orderBy: [{ gender: 'asc' }, { eventType: 'asc' }, { name: 'asc' }],
    })
    res.json(events)
  } catch (err) {
    next(err)
  }
}

export async function createEvent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await assertTournamentAdmin(req.params.id, req.user!.id, req.user!.role)
    const data = eventSchema.parse(req.body)
    const event = await prisma.tournamentEvent.create({
      data: {
        ...data,
        tournamentId: req.params.id,
        scoringConfig: data.scoringConfig === null ? Prisma.JsonNull : data.scoringConfig as Prisma.InputJsonValue,
      },
    })
    res.status(201).json(event)
  } catch (err) {
    next(err)
  }
}

export async function updateEvent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await assertTournamentAdmin(req.params.id, req.user!.id, req.user!.role)
    const data = eventSchema.partial().parse(req.body)
    const event = await prisma.tournamentEvent.update({
      where: { id: req.params.eventId },
      data: {
        ...data,
        scoringConfig: data.scoringConfig === null ? Prisma.JsonNull : data.scoringConfig as Prisma.InputJsonValue,
      },
    })
    res.json(event)
  } catch (err) {
    next(err)
  }
}

export async function deleteEvent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await assertTournamentAdmin(req.params.id, req.user!.id, req.user!.role)
    await prisma.tournamentEvent.delete({ where: { id: req.params.eventId } })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

const statusSchema = z.object({
  status: z.enum(['DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
})

export async function updateEventStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await assertTournamentAdmin(req.params.id, req.user!.id, req.user!.role)
    const { status } = statusSchema.parse(req.body)
    const event = await prisma.tournamentEvent.update({
      where: { id: req.params.eventId },
      data: { status },
    })
    res.json(event)
  } catch (err) {
    next(err)
  }
}
