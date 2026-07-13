import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import * as nc from '../controllers/notification.controller'

const router = Router()

router.get('/', authenticate, nc.getNotifications)
router.patch('/:id/read', authenticate, nc.markRead)
router.patch('/read-all', authenticate, nc.markAllRead)
router.get('/settings/:tournamentId', authenticate, nc.getSettings)
router.put('/settings/:tournamentId', authenticate, nc.updateSettings)

export default router
