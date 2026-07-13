import { Router } from 'express'
import * as sportController from '../controllers/sport.controller'

const router = Router()

router.get('/', sportController.listSports)

export default router
