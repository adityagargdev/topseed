import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import * as teamController from '../controllers/team.controller'

const router = Router()

router.post('/', authenticate, teamController.createTeam)
router.get('/mine', authenticate, teamController.getMyTeams)
router.get('/:id', authenticate, teamController.getTeam)
router.patch('/:id', authenticate, teamController.updateTeam)
router.post('/:id/players', authenticate, teamController.addPlayer)
router.delete('/:id/players/:playerId', authenticate, teamController.removePlayer)

export default router
