import { Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../config/prisma'
import { AuthenticatedRequest } from '../types'
import { AppError } from '../middleware/error.middleware'
import { emitScoreUpdate, emitMatchStatus } from '../socket'
import { notifyMatchUpdate } from '../services/notification.service'

export async function getMatch(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const match = await prisma.match.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        entry1: { include: { team: true, player: { include: { user: true } } } },
        entry2: { include: { team: true, player: { include: { user: true } } } },
        winner: { include: { team: true, player: { include: { user: true } } } },
      },
    })
    res.json(match)
  } catch (err) {
    next(err)
  }
}

const scoreSchema = z.object({
  scores: z.record(z.unknown()),
  winnerId: z.string().optional().nullable(),
})

export async function updateScore(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const match = await prisma.match.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { tournament: true },
    })

    // Verify requesting admin owns this tournament
    if (match.tournament.adminId !== req.user!.id && req.user!.role !== 'SUPER_ADMIN') {
      throw new AppError('You do not manage this tournament', 403)
    }

    const { scores, winnerId } = scoreSchema.parse(req.body)

    const updated = await prisma.match.update({
      where: { id: req.params.id },
      data: {
        scores: scores as import('@prisma/client').Prisma.InputJsonValue,
        winnerId: winnerId ?? undefined,
        status: winnerId ? 'COMPLETED' : 'LIVE',
        completedAt: winnerId ? new Date() : undefined,
      },
    })

    // Advance winner in bracket if completed
    if (winnerId && match.nextMatchId) {
      const nextMatch = await prisma.match.findUnique({ where: { id: match.nextMatchId } })
      if (nextMatch) {
        await prisma.match.update({
          where: { id: match.nextMatchId },
          data: match.nextMatchSlot === 1 ? { entry1Id: winnerId } : { entry2Id: winnerId },
        })
      }
    }

    // Handle 3rd-place match: loser of semi-final advances
    if (winnerId && match.loserNextMatchId) {
      const loserId = winnerId === match.entry1Id ? match.entry2Id : match.entry1Id
      if (loserId) {
        await prisma.match.update({
          where: { id: match.loserNextMatchId },
          data: match.loserNextMatchSlot === 1 ? { entry1Id: loserId } : { entry2Id: loserId },
        })
      }
    }

    // Real-time broadcast
    emitScoreUpdate(match.tournamentId, req.params.id, { scores, winnerId, status: updated.status })

    // Notifications
    await notifyMatchUpdate(
      req.params.id,
      match.tournamentId,
      'Score Updated',
      `Match score has been updated`,
      'scoreUpdates'
    )

    res.json(updated)
  } catch (err) {
    next(err)
  }
}

const scheduleSchema = z.object({
  scheduledAt: z.string().datetime(),
})

export async function scheduleMatch(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { scheduledAt } = scheduleSchema.parse(req.body)
    const match = await prisma.match.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { tournament: true },
    })
    if (match.tournament.adminId !== req.user!.id && req.user!.role !== 'SUPER_ADMIN') {
      throw new AppError('You do not manage this tournament', 403)
    }
    const updated = await prisma.match.update({
      where: { id: req.params.id },
      data: { scheduledAt: new Date(scheduledAt) },
    })
    res.json(updated)
  } catch (err) {
    next(err)
  }
}

const statusSchema = z.object({
  status: z.enum(['UPCOMING', 'LIVE', 'COMPLETED', 'WALKOVER', 'CANCELLED']),
})

export async function updateMatchStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { status } = statusSchema.parse(req.body)
    const match = await prisma.match.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { tournament: true },
    })

    if (match.tournament.adminId !== req.user!.id && req.user!.role !== 'SUPER_ADMIN') {
      throw new AppError('You do not manage this tournament', 403)
    }

    const updated = await prisma.match.update({
      where: { id: req.params.id },
      data: { status, completedAt: status === 'COMPLETED' || status === 'WALKOVER' ? new Date() : undefined },
    })

    // Advance bracket when a match is completed/walkoverd and a winner is already recorded
    if ((status === 'COMPLETED' || status === 'WALKOVER') && match.winnerId) {
      if (match.nextMatchId) {
        const nextMatch = await prisma.match.findUnique({ where: { id: match.nextMatchId } })
        if (nextMatch) {
          await prisma.match.update({
            where: { id: match.nextMatchId },
            data: match.nextMatchSlot === 1 ? { entry1Id: match.winnerId } : { entry2Id: match.winnerId },
          })
        }
      }
      if (match.loserNextMatchId) {
        const loserId = match.winnerId === match.entry1Id ? match.entry2Id : match.entry1Id
        if (loserId) {
          await prisma.match.update({
            where: { id: match.loserNextMatchId },
            data: match.loserNextMatchSlot === 1 ? { entry1Id: loserId } : { entry2Id: loserId },
          })
        }
      }
    }

    emitMatchStatus(match.tournamentId, req.params.id, status)

    if (status === 'LIVE') {
      await notifyMatchUpdate(req.params.id, match.tournamentId, 'Match Started', 'A match is now live!', 'matchStart')
    }

    res.json(updated)
  } catch (err) {
    next(err)
  }
}
