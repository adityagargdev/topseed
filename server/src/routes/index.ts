import { Router } from 'express'
import authRoutes from './auth.routes'
import tournamentRoutes from './tournament.routes'
import matchRoutes from './match.routes'
import teamRoutes from './team.routes'
import adminRoutes from './admin.routes'
import notificationRoutes from './notification.routes'
import sportRoutes from './sport.routes'
import paymentRoutes from './payment.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/tournaments', tournamentRoutes)
router.use('/matches', matchRoutes)
router.use('/teams', teamRoutes)
router.use('/admin', adminRoutes)
router.use('/notifications', notificationRoutes)
router.use('/sports', sportRoutes)
router.use('/payments', paymentRoutes)

export default router
