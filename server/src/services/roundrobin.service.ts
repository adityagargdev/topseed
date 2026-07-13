/**
 * Round-robin fixture generation using the "circle method".
 * With n entries: if n is even → n-1 rounds, n/2 matches per round.
 *                 if n is odd  → n rounds, (n-1)/2 matches per round (one bye each round).
 */

export interface RREntry {
  id: string
}

export interface RRMatch {
  round: number
  matchNumber: number
  bracketSlot: string
  entry1Id: string
  entry2Id: string
}

export function generateRoundRobin(entries: RREntry[]): RRMatch[] {
  const n = entries.length
  if (n < 2) throw new Error('Need at least 2 entries')

  const teams = [...entries]
  const hasOdd = n % 2 !== 0
  if (hasOdd) teams.push({ id: 'BYE' }) // ghost entry for byes

  const N = teams.length
  const matches: RRMatch[] = []
  let matchNumber = 0

  for (let round = 0; round < N - 1; round++) {
    for (let i = 0; i < N / 2; i++) {
      const t1 = teams[i]
      const t2 = teams[N - 1 - i]
      if (t1.id !== 'BYE' && t2.id !== 'BYE') {
        matches.push({
          round: round + 1,
          matchNumber: ++matchNumber,
          bracketSlot: `RR R${round + 1} M${i + 1}`,
          entry1Id: t1.id,
          entry2Id: t2.id,
        })
      }
    }
    // Rotate: keep teams[0] fixed, rotate rest clockwise
    const last = teams[N - 1]
    for (let i = N - 1; i > 1; i--) teams[i] = teams[i - 1]
    teams[1] = last
  }

  return matches
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

/**
 * Calculates standings from completed round-robin matches.
 * pointsConfig: { win, draw, loss } - admin-configured point values.
 * For tiebreaking, uses: wins → fewest losses → sets/games won ratio.
 */
export function calculateStandings(
  entryIds: string[],
  completedMatches: Array<{
    entry1Id: string | null
    entry2Id: string | null
    winnerId: string | null
    scores: unknown
  }>,
  pointsConfig = { win: 3, draw: 1, loss: 0 }
): RRStanding[] {
  const table: Record<string, RRStanding> = {}

  for (const id of entryIds) {
    table[id] = { entryId: id, played: 0, wins: 0, draws: 0, losses: 0, points: 0, setsWon: 0, setsLost: 0 }
  }

  for (const match of completedMatches) {
    if (!match.entry1Id || !match.entry2Id) continue

    const e1 = table[match.entry1Id]
    const e2 = table[match.entry2Id]
    if (!e1 || !e2) continue

    e1.played++
    e2.played++

    // Tally sets from scores JSON if present
    const scores = match.scores as Record<string, { setsWon?: number; gamesWon?: number }> | null
    if (scores) {
      e1.setsWon += scores.entry1?.setsWon ?? scores.entry1?.gamesWon ?? 0
      e1.setsLost += scores.entry2?.setsWon ?? scores.entry2?.gamesWon ?? 0
      e2.setsWon += scores.entry2?.setsWon ?? scores.entry2?.gamesWon ?? 0
      e2.setsLost += scores.entry1?.setsWon ?? scores.entry1?.gamesWon ?? 0
    }

    if (!match.winnerId) {
      // Draw
      e1.draws++; e1.points += pointsConfig.draw
      e2.draws++; e2.points += pointsConfig.draw
    } else if (match.winnerId === match.entry1Id) {
      e1.wins++; e1.points += pointsConfig.win
      e2.losses++; e2.points += pointsConfig.loss
    } else {
      e2.wins++; e2.points += pointsConfig.win
      e1.losses++; e1.points += pointsConfig.loss
    }
  }

  return Object.values(table).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.wins !== a.wins) return b.wins - a.wins
    if (a.losses !== b.losses) return a.losses - b.losses
    // Sets ratio tiebreaker
    const aRatio = a.setsLost === 0 ? a.setsWon : a.setsWon / a.setsLost
    const bRatio = b.setsLost === 0 ? b.setsWon : b.setsWon / b.setsLost
    return bRatio - aRatio
  })
}
