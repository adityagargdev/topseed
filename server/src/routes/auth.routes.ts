import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import * as authController from '../controllers/auth.controller'

const router = Router()

// Called after Firebase sign-in to sync user to DB and return profile
router.post('/sync', authenticate, authController.syncUser)
router.get('/me', authenticate, authController.getMe)
router.patch('/me', authenticate, authController.updateMe)
router.get('/lookup', authenticate, authController.lookupUser)
router.post('/request-admin', authenticate, authController.requestAdmin)

export default router
