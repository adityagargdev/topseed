export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER'
export type EventType = 'SINGLES' | 'DOUBLES' | 'TEAM'
export type GenderCategory = 'MEN' | 'WOMEN' | 'MIXED' | 'OPEN'
export type MatchFormat = 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN'
export type TournamentStatus = 'DRAFT' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type MatchStatus = 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'WALKOVER' | 'CANCELLED'

export interface User {
  id: string
  firebaseUid: string
  displayName: string
  email?: string | null
  phone?: string | null
  photoURL?: string | null
  role: UserRole
  adminRequest?: AdminRequest | null
}

export interface AdminRequest {
  id: string
  userId: string
  reason?: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
}

export interface Sport {
  id: string
  name: string
  icon?: string | null
}

// Tournament is the container — sport, organizer info, dates, visibility.
// All competition specifics live in TournamentEvent.
export interface Tournament {
  id: string
  name: string
  description?: string | null
  sport: Sport
  sportId: string
  adminId: string
  admin: { displayName: string; email?: string | null }
  status: TournamentStatus
  isPublic: boolean
  organizerName?: string | null
  address?: string | null
  locationUrl?: string | null
  venue?: string | null
  prizeMoney?: string | null
  startDate?: string | null
  endDate?: string | null
  registrationDeadline?: string | null
  createdAt: string
  events?: TournamentEvent[]
  _count?: { events: number; matches: number }
}

// One event within a tournament (e.g. "Men's Singles", "Mixed Doubles", "Under-18 Girls")
export interface TournamentEvent {
  id: string
  tournamentId: string
  name: string
  eventType: EventType
  gender: GenderCategory
  ageGroup?: string | null
  format: MatchFormat
  status: TournamentStatus
  maxEntries?: number | null
  entryFee?: number | null  // in paise, null = free
  scoringConfig?: Record<string, unknown> | null
  createdAt: string
  _count?: { entries: number; matches: number }
}

export interface Player {
  id: string
  userId: string
  teamId?: string | null
  user: { displayName: string; email?: string | null; photoURL?: string | null }
}

export interface Team {
  id: string
  name: string
  captainId: string
  captain: { displayName: string }
  players: Player[]
}

export interface TournamentEntry {
  id: string
  eventId: string
  teamId?: string | null
  playerId?: string | null
  partnerId?: string | null
  seed?: number | null
  team?: Team | null
  player?: Player | null
  partner?: Player | null
  registeredAt: string
}

export interface Match {
  id: string
  tournamentId: string
  eventId: string
  round: number
  matchNumber: number
  bracketSlot?: string | null
  entry1Id?: string | null
  entry2Id?: string | null
  winnerId?: string | null
  nextMatchId?: string | null
  nextMatchSlot?: number | null
  isThirdPlace: boolean
  status: MatchStatus
  scheduledAt?: string | null
  completedAt?: string | null
  scores?: Record<string, unknown> | null
  notes?: string | null
  entry1?: TournamentEntry | null
  entry2?: TournamentEntry | null
  winner?: TournamentEntry | null
  event?: { name: string } | null
}

export interface Notification {
  id: string
  userId: string
  matchId?: string | null
  tournamentId?: string | null
  title: string
  body: string
  read: boolean
  createdAt: string
}

export interface NotificationSettings {
  scoreUpdates: boolean
  matchStart: boolean
  statusChange: boolean
}

export interface RRStanding {
  entryId: string
  played: number
  wins: number
  draws: number
  losses: number
  points: number
  setsWon: number
  setsLost: number
}
