import { Response, NextFunction } from 'express'
import { UserRole } from '@prisma/client'
import { AuthenticatedRequest } from '../types'

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' })
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' })
    }
    next()
  }
}

export const requireAdmin = requireRole('ADMIN', 'SUPER_ADMIN')
export const requireSuperAdmin = requireRole('SUPER_ADMIN')
