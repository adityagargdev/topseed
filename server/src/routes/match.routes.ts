import { Router } from 'express'
import { authenticate, optionalAuth } from '../middleware/auth.middleware'
import { requireAdmin } from '../middleware/role.middleware'
import * as mc from '../controllers/match.controller'

const router = Router()

router.get('/:id', optionalAuth, mc.getMatch)
router.patch('/:id/score', authenticate, requireAdmin, mc.updateScore)
router.patch('/:id/schedule', authenticate, requireAdmin, mc.scheduleMatch)
router.patch('/:id/status', authenticate, requireAdmin, mc.updateMatchStatus)

export default router
