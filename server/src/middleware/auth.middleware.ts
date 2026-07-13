import { Response, NextFunction } from 'express'
import admin from '../config/firebase-admin'
import prisma from '../config/prisma'
import { AuthenticatedRequest } from '../types'

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing authorization token' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = await admin.auth().verifyIdToken(token)

    // upsert avoids a race condition where two concurrent first-login requests
    // both pass the findUnique check and then both attempt create, hitting a unique constraint
    const user = await prisma.user.upsert({
      where: { firebaseUid: decoded.uid },
      update: {},
      create: {
        firebaseUid: decoded.uid,
        displayName: decoded.name ?? decoded.email?.split('@')[0] ?? 'User',
        email: decoded.email ?? null,
        phone: decoded.phone_number ?? null,
        photoURL: decoded.picture ?? null,
      },
    })

    req.user = {
      id: user.id,
      firebaseUid: user.firebaseUid,
      role: user.role,
      displayName: user.displayName,
    }

    next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return next()

  const token = authHeader.split(' ')[1]
  try {
    const decoded = await admin.auth().verifyIdToken(token)
    const user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } })
    if (user) {
      req.user = { id: user.id, firebaseUid: user.firebaseUid, role: user.role, displayName: user.displayName }
    }
  } catch {
    // ignore invalid token for optional auth
  }
  next()
}
