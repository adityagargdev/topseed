import { Match, TournamentEntry } from '../../types'
import { getEntryName, STATUS_COLORS, cn } from '../../lib/utils'

interface Props {
  entries: TournamentEntry[]
  matches: Match[]
  scoringConfig?: Record<string, unknown> | null
}

interface Standing {
  entry: TournamentEntry
  played: number
  wins: number
  draws: number
  losses: number
  points: number
  setsWon: number
  setsLost: number
}

export default function RoundRobinTable({ entries, matches, scoringConfig }: Props) {
  const pointsWin = Number(scoringConfig?.pointsWin ?? 3)
  const pointsDraw = Number(scoringConfig?.pointsDraw ?? 1)
  const pointsLoss = Number(scoringConfig?.pointsLoss ?? 0)

  const standings = calcStandings(entries, matches, { pointsWin, pointsDraw, pointsLoss })

  return (
    <div className="space-y-8">
      {/* Standings Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 px-3 text-gray-500 font-medium w-8">#</th>
              <th className="text-left py-2 px-3 text-gray-700 font-semibold">Name</th>
              <th className="text-center py-2 px-3 text-gray-500 font-medium">P</th>
              <th className="text-center py-2 px-3 text-gray-500 font-medium">W</th>
              <th className="text-center py-2 px-3 text-gray-500 font-medium">D</th>
              <th className="text-center py-2 px-3 text-gray-500 font-medium">L</th>
              <th className="text-center py-2 px-3 text-gray-700 font-semibold">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {standings.map((row, i) => (
              <tr key={row.entry.id} className={cn(i < 3 ? 'bg-green-50/40' : '')}>
                <td className="py-2 px-3 text-gray-400">{i + 1}</td>
                <td className="py-2 px-3 font-medium text-gray-900">{getEntryName(row.entry)}</td>
                <td className="text-center py-2 px-3 text-gray-600">{row.played}</td>
                <td className="text-center py-2 px-3 text-green-700">{row.wins}</td>
                <td className="text-center py-2 px-3 text-yellow-700">{row.draws}</td>
                <td className="text-center py-2 px-3 text-red-700">{row.losses}</td>
                <td className="text-center py-2 px-3 font-bold text-gray-900">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Matches Grid */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Fixtures</h3>
        <div className="space-y-2">
          {groupByRound(matches).map(({ round, roundMatches }) => (
            <div key={round}>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Round {round}</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {roundMatches.map(match => (
                  <div key={match.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                    <div className={cn('text-xs font-medium mb-2 inline-block px-2 py-0.5 rounded-full', STATUS_COLORS[match.status])}>
                      {match.status}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate flex-1">{getEntryName(match.entry1)}</span>
                      <span className="text-xs font-bold text-gray-500 shrink-0">vs</span>
                      <span className="text-sm font-medium text-gray-900 truncate flex-1 text-right">{getEntryName(match.entry2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function calcStandings(
  entries: TournamentEntry[],
  matches: Match[],
  pts: { pointsWin: number; pointsDraw: number; pointsLoss: number }
): Standing[] {
  const map: Record<string, Standing> = {}
  entries.forEach(e => { map[e.id] = { entry: e, played: 0, wins: 0, draws: 0, losses: 0, points: 0, setsWon: 0, setsLost: 0 } })

  for (const m of matches) {
    if (m.status !== 'COMPLETED' || !m.entry1Id || !m.entry2Id) continue
    const e1 = map[m.entry1Id]; const e2 = map[m.entry2Id]
    if (!e1 || !e2) continue
    e1.played++; e2.played++
    const s = m.scores as Record<string, { setsWon?: number; gamesWon?: number }> | null
    if (s) {
      e1.setsWon += s.entry1?.setsWon ?? s.entry1?.gamesWon ?? 0
      e1.setsLost += s.entry2?.setsWon ?? s.entry2?.gamesWon ?? 0
      e2.setsWon += s.entry2?.setsWon ?? s.entry2?.gamesWon ?? 0
      e2.setsLost += s.entry1?.setsWon ?? s.entry1?.gamesWon ?? 0
    }
    if (!m.winnerId) {
      e1.draws++; e1.points += pts.pointsDraw
      e2.draws++; e2.points += pts.pointsDraw
    } else if (m.winnerId === m.entry1Id) {
      e1.wins++; e1.points += pts.pointsWin; e2.losses++; e2.points += pts.pointsLoss
    } else {
      e2.wins++; e2.points += pts.pointsWin; e1.losses++; e1.points += pts.pointsLoss
    }
  }

  return Object.values(map).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.wins !== a.wins) return b.wins - a.wins
    if (a.losses !== b.losses) return a.losses - b.losses
    const aR = a.setsLost === 0 ? a.setsWon : a.setsWon / a.setsLost
    const bR = b.setsLost === 0 ? b.setsWon : b.setsWon / b.setsLost
    return bR - aR
  })
}

function groupByRound(matches: Match[]) {
  const map: Record<number, Match[]> = {}
  for (const m of matches) {
    if (!map[m.round]) map[m.round] = []
    map[m.round].push(m)
  }
  return Object.entries(map)
    .map(([round, roundMatches]) => ({ round: Number(round), roundMatches }))
    .sort((a, b) => a.round - b.round)
}
