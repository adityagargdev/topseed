import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { createOrder, verifyPayment } from '../controllers/payment.controller'

const router = Router()

router.post('/create-order', authenticate, createOrder)
router.post('/verify', authenticate, verifyPayment)

export default router
