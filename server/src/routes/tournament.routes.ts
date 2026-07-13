import { Router } from 'express'
import { authenticate, optionalAuth } from '../middleware/auth.middleware'
import { requireAdmin } from '../middleware/role.middleware'
import * as tc from '../controllers/tournament.controller'
import * as ec from '../controllers/event.controller'

const router = Router()

// ── Tournament CRUD ────────────────────────────────────────────────────────
router.get('/', optionalAuth, tc.listTournaments)
router.post('/', authenticate, requireAdmin, tc.createTournament)
router.post('/:id/access', optionalAuth, tc.verifyTournamentAccess)
router.get('/:id', optionalAuth, tc.getTournament)
router.patch('/:id', authenticate, requireAdmin, tc.updateTournament)
router.delete('/:id', authenticate, requireAdmin, tc.deleteTournament)
router.patch('/:id/status', authenticate, requireAdmin, tc.updateStatus)

// ── Event management (nested under tournament) ─────────────────────────────
router.get('/:id/events', optionalAuth, ec.listEvents)
router.post('/:id/events', authenticate, requireAdmin, ec.createEvent)
router.patch('/:id/events/:eventId', authenticate, requireAdmin, ec.updateEvent)
router.delete('/:id/events/:eventId', authenticate, requireAdmin, ec.deleteEvent)
router.patch('/:id/events/:eventId/status', authenticate, requireAdmin, ec.updateEventStatus)

// ── Per-event data (eventId as query param) ────────────────────────────────
router.get('/:id/entries', optionalAuth, tc.getEntries)          // ?eventId=
router.get('/:id/seedings', optionalAuth, tc.getSeedings)        // ?eventId=
router.get('/:id/matches', optionalAuth, tc.getMatches)          // ?eventId= &date=
router.get('/:id/winners', optionalAuth, tc.getWinners)          // ?eventId=
router.post('/:id/register', authenticate, tc.registerEntry)     // body: { eventId, teamId?, partnerId? }
router.delete('/:id/register', authenticate, tc.withdrawEntry)   // body: { eventId }
router.patch('/:id/seedings', authenticate, requireAdmin, tc.updateSeedings)           // body: [{ entryId, seed }]
router.post('/:id/generate-fixtures', authenticate, requireAdmin, tc.generateFixtures) // body: { eventId, mode }

export default router
