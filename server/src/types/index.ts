import { UserRole } from '@prisma/client'
import { Request } from 'express'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    firebaseUid: string
    role: UserRole
    displayName: string
  }
}

export interface BracketMatch {
  id: string
  round: number
  matchNumber: number
  bracketSlot: string
  entry1Id: string | null
  entry2Id: string | null
  winnerId: string | null
  nextMatchId: string | null
  nextMatchSlot: number | null
  loserNextMatchId: string | null
  loserNextMatchSlot: number | null
  isThirdPlace: boolean
}

export interface RoundRobinStanding {
  entryId: string
  played: number
  wins: number
  draws: number
  losses: number
  points: number
  setsWon: number
  setsLost: number
}

export interface ScoreUpdate {
  matchId: string
  scores: Record<string, unknown>
  status: string
  winnerId?: string
}
