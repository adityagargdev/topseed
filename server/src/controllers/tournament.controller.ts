import { Response, NextFunction } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import prisma from '../config/prisma'
import { AuthenticatedRequest } from '../types'
import { AppError } from '../middleware/error.middleware'
import { generateSingleElimination, generateDoubleElimination } from '../services/bracket.service'
import { generateRoundRobin, calculateStandings } from '../services/roundrobin.service'

// ── Schema ──────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  sportId: z.string(),
  isPublic: z.boolean().default(true),
  password: z.string().min(4).optional(),
  organizerName: z.string().optional(),
  address: z.string().optional(),
  locationUrl: z.preprocess(v => v === '' ? undefined : v, z.string().url().optional().nullable()),
  venue: z.string().optional(),
  prizeMoney: z.string().optional(),
  startDate: z.preprocess(v => v === '' ? undefined : v, z.string().datetime().optional()),
  endDate: z.preprocess(v => v === '' ? undefined : v, z.string().datetime().optional()),
  registrationDeadline: z.preprocess(v => v === '' ? undefined : v, z.string().datetime().optional()),
})

// Update allows null password to clear it; create does not (string only)
const updateSchema = createSchema.omit({ password: true }).partial().extend({
  password: z.string().min(4).nullable().optional(),
})

// ── Helpers ──────────────────────────────────────────────────────────────────

const entryIncludes = {
  team: { include: { players: { include: { user: { select: { displayName: true, email: true } } } }, captain: { select: { displayName: true } } } },
  player: { include: { user: { select: { displayName: true, email: true, photoURL: true } } } },
  partner: { include: { user: { select: { displayName: true } } } },
}

const matchIncludes = {
  entry1: { include: { team: { select: { name: true } }, player: { include: { user: { select: { displayName: true } } } }, partner: { include: { user: { select: { displayName: true } } } } } },
  entry2: { include: { team: { select: { name: true } }, player: { include: { user: { select: { displayName: true } } } }, partner: { include: { user: { select: { displayName: true } } } } } },
  winner: { include: { team: { select: { name: true } }, player: { include: { user: { select: { displayName: true } } } } } },
  event: { select: { name: true } },
}

// ── Tournament CRUD ──────────────────────────────────────────────────────────

export async function listTournaments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { sport, status, search } = req.query as Record<string, string>
    // Admins can see their own private tournaments; everyone else only sees public ones
    const visibilityFilter = req.user
      ? { OR: [{ isPublic: true }, { adminId: req.user.id }] }
      : { isPublic: true as const }
    const tournaments = await prisma.tournament.findMany({
      where: {
        ...visibilityFilter,
        ...(sport && { sport: { name: sport } }),
        ...(status && { status: status as never }),
        ...(search && { name: { contains: search, mode: 'insensitive' } }),
      },
      include: {
        sport: true,
        admin: { select: { displayName: true } },
        _count: { select: { events: true, matches: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(tournaments)
  } catch (err) {
    next(err)
  }
}

export async function verifyTournamentAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { password } = req.body as { password?: string }
    const tournament = await prisma.tournament.findUniqueOrThrow({ where: { id: req.params.id } })
    if (tournament.isPublic) return res.json({ access: true })
    if (!password || !tournament.password) return res.status(403).json({ access: false })
    const ok = await bcrypt.compare(password, tournament.password)
    res.json({ access: ok })
  } catch (err) {
    next(err)
  }
}

export async function getTournament(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const tournament = await prisma.tournament.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        sport: true,
        admin: { select: { displayName: true, email: true } },
        events: {
          include: { _count: { select: { entries: true, matches: true } } },
          orderBy: [{ gender: 'asc' }, { eventType: 'asc' }, { name: 'asc' }],
        },
        _count: { select: { events: true, matches: true } },
      },
    })
    const { password: _pw, ...safe } = tournament
    res.json(safe)
  } catch (err) {
    next(err)
  }
}

export async function createTournament(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = createSchema.parse(req.body)
    const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : undefined
    const tournament = await prisma.tournament.create({
      data: {
        ...data,
        password: hashedPassword,
        adminId: req.user!.id,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        registrationDeadline: data.registrationDeadline ? new Date(data.registrationDeadline) : undefined,
      },
      include: { sport: true },
    })
    const { password: _pw, ...safe } = tournament
    res.status(201).json(safe)
  } catch (err) {
    next(err)
  }
}

export async function updateTournament(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const t = await prisma.tournament.findUniqueOrThrow({ where: { id: req.params.id } })
    if (t.adminId !== req.user!.id && req.user!.role !== 'SUPER_ADMIN') throw new AppError('Forbidden', 403)
    const data = updateSchema.parse(req.body)
    // null  → clear the password; string → hash it; undefined → leave unchanged
    let hashedPassword: string | null | undefined
    if (data.password === null) {
      hashedPassword = null
    } else if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10)
    }
    const updated = await prisma.tournament.update({ where: { id: req.params.id }, data: { ...data, password: hashedPassword } })
    const { password: _pw, ...safe } = updated
    res.json(safe)
  } catch (err) {
    next(err)
  }
}

export async function deleteTournament(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const t = await prisma.tournament.findUniqueOrThrow({ where: { id: req.params.id } })
    if (t.adminId !== req.user!.id && req.user!.role !== 'SUPER_ADMIN') throw new AppError('Forbidden', 403)
    await prisma.tournament.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

const statusSchema = z.object({ status: z.enum(['DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']) })

export async function updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const t = await prisma.tournament.findUniqueOrThrow({ where: { id: req.params.id } })
    if (t.adminId !== req.user!.id && req.user!.role !== 'SUPER_ADMIN') throw new AppError('Forbidden', 403)
    const { status } = statusSchema.parse(req.body)
    const updated = await prisma.tournament.update({ where: { id: req.params.id }, data: { status } })
    res.json(updated)
  } catch (err) {
    next(err)
  }
}

// ── Per-event queries ────────────────────────────────────────────────────────

export async function getEntries(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.query as { eventId?: string }
    if (!eventId) throw new AppError('eventId query param required', 400)
    const entries = await prisma.tournamentEntry.findMany({
      where: { eventId },
      include: entryIncludes,
      orderBy: { seed: 'asc' },
    })
    res.json(entries)
  } catch (err) {
    next(err)
  }
}

export async function getSeedings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.query as { eventId?: string }
    if (!eventId) throw new AppError('eventId query param required', 400)
    const entries = await prisma.tournamentEntry.findMany({
      where: { eventId, seed: { not: null } },
      include: {
        team: { select: { name: true } },
        player: { include: { user: { select: { displayName: true } } } },
        partner: { include: { user: { select: { displayName: true } } } },
      },
      orderBy: { seed: 'asc' },
    })
    res.json(entries)
  } catch (err) {
    next(err)
  }
}

const seedingsSchema = z.array(z.object({ entryId: z.string(), seed: z.number().int().positive().nullable() }))

export async function updateSeedings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const t = await prisma.tournament.findUniqueOrThrow({ where: { id: req.params.id } })
    if (t.adminId !== req.user!.id && req.user!.role !== 'SUPER_ADMIN') throw new AppError('Forbidden', 403)
    const seedings = seedingsSchema.parse(req.body)

    // Validate all supplied entryIds actually belong to this tournament
    const entryIds = seedings.map(s => s.entryId)
    const validEntries = await prisma.tournamentEntry.findMany({
      where: { id: { in: entryIds }, event: { tournamentId: req.params.id } },
      select: { id: true },
    })
    const validIds = new Set(validEntries.map(e => e.id))
    const invalid = entryIds.filter(id => !validIds.has(id))
    if (invalid.length > 0) throw new AppError('One or more entries do not belong to this tournament', 400)

    await prisma.$transaction(
      seedings.map(s => prisma.tournamentEntry.update({ where: { id: s.entryId }, data: { seed: s.seed } }))
    )
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function registerEntry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { eventId, teamId, partnerId } = req.body as { eventId: string; teamId?: string; partnerId?: string }
    if (!eventId) throw new AppError('eventId is required', 400)

    const event = await prisma.tournamentEvent.findUniqueOrThrow({
      where: { id: eventId },
      include: { tournament: { select: { registrationDeadline: true } } },
    })
    if (event.status !== 'REGISTRATION_OPEN') throw new AppError('Registration is not open for this event', 400)
    if (event.entryFee && event.entryFee > 0) throw new AppError('This event requires payment. Use the payment flow to register.', 400)

    if (event.maxEntries !== null) {
      const count = await prisma.tournamentEntry.count({ where: { eventId } })
      if (count >= event.maxEntries) throw new AppError('This event is full', 409)
    } else if (event.tournament.registrationDeadline && new Date() > event.tournament.registrationDeadline) {
      throw new AppError('Registration deadline has passed', 400)
    }

    if (event.eventType === 'TEAM') {
      if (!teamId) throw new AppError('teamId required for team events', 400)
      const team = await prisma.team.findUniqueOrThrow({ where: { id: teamId } })
      if (team.captainId !== req.user!.id) throw new AppError('Only the team captain can register', 403)
      const entry = await prisma.tournamentEntry.create({ data: { eventId, teamId } })
      return res.status(201).json(entry)
    }

    // SINGLES or DOUBLES
    const player = await prisma.player.upsert({
      where: { userId: req.user!.id },
      update: {},
      create: { userId: req.user!.id },
    })

    // Prevent duplicate registrations
    const existingEntry = await prisma.tournamentEntry.findUnique({
      where: { eventId_playerId: { eventId, playerId: player.id } },
    })
    if (existingEntry) throw new AppError('Already registered for this event', 409)

    let resolvedPartnerId: string | undefined
    if (event.eventType === 'DOUBLES') {
      if (!partnerId) throw new AppError('partnerId required for doubles events', 400)
      if (partnerId === player.id) throw new AppError('Cannot partner with yourself', 400)
      // Ensure partner has a player profile
      const partnerPlayer = await prisma.player.findUniqueOrThrow({ where: { id: partnerId } })
      resolvedPartnerId = partnerPlayer.id
    }

    const entry = await prisma.tournamentEntry.create({
      data: { eventId, playerId: player.id, partnerId: resolvedPartnerId ?? null },
    })
    res.status(201).json(entry)
  } catch (err) {
    next(err)
  }
}

export async function withdrawEntry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.body as { eventId: string }
    if (!eventId) throw new AppError('eventId required', 400)
    const event = await prisma.tournamentEvent.findUniqueOrThrow({ where: { id: eventId } })
    if (event.status !== 'REGISTRATION_OPEN') throw new AppError('Cannot withdraw after registration closes', 400)

    if (event.eventType === 'TEAM') {
      // Only the team captain can withdraw; find their team that has an entry for this event
      const team = await prisma.team.findFirst({
        where: { captainId: req.user!.id, entries: { some: { eventId } } },
      })
      if (!team) throw new AppError('Not registered', 404)
      await prisma.tournamentEntry.deleteMany({ where: { eventId, teamId: team.id } })
    } else {
      const player = await prisma.player.findUnique({ where: { userId: req.user!.id } })
      if (!player) throw new AppError('Not registered', 404)
      await prisma.tournamentEntry.deleteMany({ where: { eventId, playerId: player.id } })
    }

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function getMatches(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { eventId, date } = req.query as { eventId?: string; date?: string }
    const matches = await prisma.match.findMany({
      where: {
        tournamentId: req.params.id,
        ...(eventId && { eventId }),
        ...(date && { scheduledAt: { gte: new Date(date), lt: new Date(new Date(date).getTime() + 86400000) } }),
      },
      include: matchIncludes,
      orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
    })
    res.json(matches)
  } catch (err) {
    next(err)
  }
}

export async function getWinners(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.query as { eventId?: string }
    if (!eventId) throw new AppError('eventId query param required', 400)

    const event = await prisma.tournamentEvent.findUniqueOrThrow({ where: { id: eventId } })

    if (event.format === 'ROUND_ROBIN') {
      const entries = await prisma.tournamentEntry.findMany({ where: { eventId } })
      const matches = await prisma.match.findMany({
        where: { eventId, status: 'COMPLETED' },
        select: { entry1Id: true, entry2Id: true, winnerId: true, scores: true },
      })
      const cfg = event.scoringConfig as Record<string, number> | null
      const standings = calculateStandings(
        entries.map(e => e.id),
        matches,
        { win: cfg?.pointsWin ?? 3, draw: cfg?.pointsDraw ?? 1, loss: cfg?.pointsLoss ?? 0 }
      )
      return res.json({ format: 'ROUND_ROBIN', standings, eventName: event.name })
    }

    const entryInclude = { include: { team: true, player: { include: { user: true } }, partner: { include: { user: true } } } }

    const finalMatch = await prisma.match.findFirst({
      where: { eventId, bracketSlot: { startsWith: 'F' }, isThirdPlace: false, status: 'COMPLETED' },
      include: { winner: entryInclude, entry1: entryInclude, entry2: entryInclude },
    })
    const thirdMatch = await prisma.match.findFirst({
      where: { eventId, isThirdPlace: true, status: 'COMPLETED' },
      include: { winner: entryInclude, entry1: entryInclude, entry2: entryInclude },
    })

    // When there's no 3rd place match (e.g. 3-player bracket), derive 3rd/4th from
    // the losers of real (non-BYE) semi-final matches.
    let sfLosers: (typeof finalMatch extends null ? never : NonNullable<typeof finalMatch>['entry1'])[] = []
    if (!thirdMatch && finalMatch) {
      const finalistIds = [finalMatch.entry1Id, finalMatch.entry2Id].filter(Boolean) as string[]
      const semiMatches = await prisma.match.findMany({
        where: { eventId, status: 'COMPLETED', isThirdPlace: false, winnerId: { in: finalistIds } },
        include: { entry1: entryInclude, entry2: entryInclude },
      })
      sfLosers = semiMatches.map(m => m.winnerId === m.entry1Id ? m.entry2 : m.entry1)
    }

    res.json({ format: 'ELIMINATION', finalMatch, thirdMatch, sfLosers, eventName: event.name })
  } catch (err) {
    next(err)
  }
}

// ── Fixture generation ────────────────────────────────────────────────────────

const fixtureSchema = z.object({
  eventId: z.string(),
  mode: z.enum(['auto', 'manual']).default('auto'),
  matches: z.array(z.object({
    round: z.number(),
    matchNumber: z.number(),
    bracketSlot: z.string().optional(),
    entry1Id: z.string().nullable().optional(),
    entry2Id: z.string().nullable().optional(),
    scheduledAt: z.string().datetime().optional(),
  })).optional(),
})

export async function generateFixtures(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const t = await prisma.tournament.findUniqueOrThrow({ where: { id: req.params.id } })
    if (t.adminId !== req.user!.id && req.user!.role !== 'SUPER_ADMIN') throw new AppError('Forbidden', 403)

    const { eventId, mode, matches: manualMatches } = fixtureSchema.parse(req.body)

    const event = await prisma.tournamentEvent.findUniqueOrThrow({
      where: { id: eventId },
      include: { entries: true },
    })

    if (mode === 'manual' && manualMatches) {
      const created = await prisma.$transaction(async (tx) => {
        await tx.match.deleteMany({ where: { eventId } })
        return tx.match.createManyAndReturn({
          data: manualMatches.map(m => ({
            tournamentId: req.params.id,
            eventId,
            round: m.round,
            matchNumber: m.matchNumber,
            bracketSlot: m.bracketSlot ?? `R${m.round} M${m.matchNumber}`,
            entry1Id: m.entry1Id ?? null,
            entry2Id: m.entry2Id ?? null,
            scheduledAt: m.scheduledAt ? new Date(m.scheduledAt) : null,
          })),
        })
      })
      return res.status(201).json(created)
    }

    const entries = event.entries.map(e => ({ id: e.id, seed: e.seed }))

    if (event.format === 'ROUND_ROBIN') {
      const rrMatches = generateRoundRobin(entries)
      // delete + create in one transaction to avoid leaving the event matchless on error
      const created = await prisma.$transaction(async (tx) => {
        await tx.match.deleteMany({ where: { eventId } })
        return tx.match.createManyAndReturn({
          data: rrMatches.map(m => ({ tournamentId: req.params.id, eventId, round: m.round, matchNumber: m.matchNumber, bracketSlot: m.bracketSlot, entry1Id: m.entry1Id, entry2Id: m.entry2Id })),
        })
      })
      return res.status(201).json(created)
    }

    const generated = event.format === 'DOUBLE_ELIMINATION'
      ? generateDoubleElimination(entries)
      : generateSingleElimination(entries)

    const created = await prisma.$transaction(async (tx) => {
      // delete inside the transaction so a create failure doesn't leave the event empty
      await tx.match.deleteMany({ where: { eventId } })

      const rows = await tx.match.createManyAndReturn({
        data: generated.map(m => ({
          tournamentId: req.params.id,
          eventId,
          round: m.round,
          matchNumber: m.matchNumber,
          bracketSlot: m.bracketSlot,
          entry1Id: m.entry1Id,
          entry2Id: m.entry2Id,
          isThirdPlace: m.isThirdPlace,
        })),
      })

      // Second pass: wire nextMatchId / loserNextMatchId using the real DB IDs
      for (let i = 0; i < generated.length; i++) {
        const gen = generated[i]
        const row = rows[i]
        if (gen.nextMatchId !== null || gen.loserNextMatchId !== null) {
          await tx.match.update({
            where: { id: row.id },
            data: {
              nextMatchId: gen.nextMatchId !== null ? rows[Number(gen.nextMatchId)].id : null,
              nextMatchSlot: gen.nextMatchSlot,
              loserNextMatchId: gen.loserNextMatchId !== null ? rows[Number(gen.loserNextMatchId)].id : null,
              loserNextMatchSlot: gen.loserNextMatchSlot,
            },
          })
        }
      }

      // Auto-advance BYEs: any R1 match with exactly one entry gets marked WALKOVER
      // and the present entry is placed into the next match immediately
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const gen = generated[i]
        const isBye = row.round === 1 && (row.entry1Id === null) !== (row.entry2Id === null)
        if (!isBye || gen.nextMatchId === null) continue
        const advancingEntryId = row.entry1Id ?? row.entry2Id
        if (!advancingEntryId) continue
        const nextRowId = rows[Number(gen.nextMatchId)].id
        await tx.match.update({
          where: { id: row.id },
          data: { status: 'WALKOVER', winnerId: advancingEntryId, completedAt: new Date() },
        })
        await tx.match.update({
          where: { id: nextRowId },
          data: gen.nextMatchSlot === 1 ? { entry1Id: advancingEntryId } : { entry2Id: advancingEntryId },
        })
      }

      return tx.match.findMany({ where: { eventId }, orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }] })
    })

    res.status(201).json(created)
  } catch (err) {
    next(err)
  }
}
