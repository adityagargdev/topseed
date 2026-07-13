import { Request, Response, NextFunction } from 'express'
import prisma from '../config/prisma'

export async function listSports(_req: Request, res: Response, next: NextFunction) {
  try {
    const sports = await prisma.sport.findMany({ orderBy: { name: 'asc' } })
    res.json(sports)
  } catch (err) {
    next(err)
  }
}
