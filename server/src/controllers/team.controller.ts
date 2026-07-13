import { Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../config/prisma'
import { AuthenticatedRequest } from '../types'
import { AppError } from '../middleware/error.middleware'

const createTeamSchema = z.object({
  name: z.string().min(1).max(80),
  players: z.array(
    z.object({
      displayName: z.string().min(1),
      email: z.string().email().optional(),
    })
  ).optional(),
})

export async function createTeam(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { name } = createTeamSchema.parse(req.body)

    // Ensure user has a player profile (auto-create)
    await prisma.player.upsert({
      where: { userId: req.user!.id },
      update: {},
      create: { userId: req.user!.id },
    })

    const team = await prisma.team.create({
      data: {
        name,
        captainId: req.user!.id,
      },
      include: { players: { include: { user: true } } },
    })
    res.status(201).json(team)
  } catch (err) {
    next(err)
  }
}

export async function getMyTeams(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const teams = await prisma.team.findMany({
      where: { captainId: req.user!.id },
      include: {
        players: { include: { user: { select: { id: true, displayName: true, email: true } } } },
        captain: { select: { displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(teams)
  } catch (err) {
    next(err)
  }
}

export async function getTeam(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const team = await prisma.team.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { players: { include: { user: { select: { displayName: true, email: true, photoURL: true } } } }, captain: { select: { displayName: true } } },
    })
    res.json(team)
  } catch (err) {
    next(err)
  }
}

const updateTeamSchema = z.object({ name: z.string().min(1).max(80) })

export async function updateTeam(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const team = await prisma.team.findUniqueOrThrow({ where: { id: req.params.id } })
    if (team.captainId !== req.user!.id && req.user!.role === 'USER') {
      throw new AppError('Only the team captain can update the team', 403)
    }
    const { name } = updateTeamSchema.parse(req.body)
    const updated = await prisma.team.update({ where: { id: req.params.id }, data: { name } })
    res.json(updated)
  } catch (err) {
    next(err)
  }
}

const addPlayerSchema = z.object({ userId: z.string() })

export async function addPlayer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const team = await prisma.team.findUniqueOrThrow({ where: { id: req.params.id } })
    if (team.captainId !== req.user!.id) throw new AppError('Only the captain can add players', 403)
    const { userId } = addPlayerSchema.parse(req.body)
    const player = await prisma.player.upsert({
      where: { userId },
      update: { teamId: team.id },
      create: { userId, teamId: team.id },
    })
    res.status(201).json(player)
  } catch (err) {
    next(err)
  }
}

export async function removePlayer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const team = await prisma.team.findUniqueOrThrow({ where: { id: req.params.id } })
    if (team.captainId !== req.user!.id) throw new AppError('Only the captain can remove players', 403)
    await prisma.player.update({
      where: { id: req.params.playerId },
      data: { teamId: null },
    })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
