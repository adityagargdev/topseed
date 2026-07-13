import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { requireSuperAdmin } from '../middleware/role.middleware'
import * as adminController from '../controllers/admin.controller'

const router = Router()

router.get('/requests', authenticate, requireSuperAdmin, adminController.listAdminRequests)
router.patch('/requests/:id/approve', authenticate, requireSuperAdmin, adminController.approveRequest)
router.patch('/requests/:id/reject', authenticate, requireSuperAdmin, adminController.rejectRequest)
router.get('/users', authenticate, requireSuperAdmin, adminController.listUsers)
router.patch('/users/:id/role', authenticate, requireSuperAdmin, adminController.setUserRole)

export default router
