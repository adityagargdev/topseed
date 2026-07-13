import { Response, NextFunction } from 'express'
import { z } from 'zod'
import prisma from '../config/prisma'
import { AuthenticatedRequest } from '../types'

export async function listAdminRequests(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const requests = await prisma.adminRequest.findMany({
      include: { user: { select: { id: true, displayName: true, email: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(requests)
  } catch (err) {
    next(err)
  }
}

export async function approveRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const request = await prisma.adminRequest.update({
      where: { id },
      data: { status: 'APPROVED' },
    })
    await prisma.user.update({
      where: { id: request.userId },
      data: { role: 'ADMIN' },
    })
    res.json(request)
  } catch (err) {
    next(err)
  }
}

export async function rejectRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const request = await prisma.adminRequest.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED' },
    })
    res.json(request)
  } catch (err) {
    next(err)
  }
}

export async function listUsers(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, displayName: true, email: true, phone: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json(users)
  } catch (err) {
    next(err)
  }
}

const roleSchema = z.object({ role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']) })

export async function setUserRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { role } = roleSchema.parse(req.body)
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
    })
    res.json(user)
  } catch (err) {
    next(err)
  }
}
