import { Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../config/prisma'
import { AuthenticatedRequest } from '../types'

export async function getNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    res.json(notifications)
  } catch (err) {
    next(err)
  }
}

export async function markRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const notif = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { read: true },
    })
    res.json(notif)
  } catch (err) {
    next(err)
  }
}

export async function markAllRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true },
    })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function getSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { tournamentId } = req.params
    const settings = await prisma.notificationSetting.findUnique({
      where: { userId_tournamentId: { userId: req.user!.id, tournamentId } },
    })
    res.json(settings ?? { scoreUpdates: true, matchStart: true, statusChange: true })
  } catch (err) {
    next(err)
  }
}

const settingsSchema = z.object({
  scoreUpdates: z.boolean(),
  matchStart: z.boolean(),
  statusChange: z.boolean(),
})

export async function updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { tournamentId } = req.params
    const data = settingsSchema.parse(req.body)
    const settings = await prisma.notificationSetting.upsert({
      where: { userId_tournamentId: { userId: req.user!.id, tournamentId } },
      update: data,
      create: { userId: req.user!.id, tournamentId, ...data },
    })
    res.json(settings)
  } catch (err) {
    next(err)
  }
}
