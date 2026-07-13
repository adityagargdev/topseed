import { Match } from '../../types'
import { getEntryName, cn, STATUS_COLORS } from '../../lib/utils'

interface Props {
  matches: Match[]
  onMatchClick?: (match: Match) => void
}

/**
 * Renders a single-elimination bracket grouped by round.
 * Rounds are shown as columns from left (earliest) to right (final).
 */
export default function EliminationBracket({ matches, onMatchClick }: Props) {
  const rounds = groupByRound(matches.filter(m => !m.isThirdPlace))
  const thirdPlace = matches.find(m => m.isThirdPlace)
  const roundNumbers = Object.keys(rounds)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-8 min-w-max">
        {roundNumbers.map(round => (
          <div key={round} className="flex flex-col gap-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center mb-2">
              {getRoundLabel(round, roundNumbers)}
            </p>
            <div className="flex flex-col justify-around h-full gap-6">
              {rounds[round].map(match => (
                <MatchCard key={match.id} match={match} onClick={onMatchClick} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {thirdPlace && (
        <div className="mt-8 border-t pt-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">3rd Place</p>
          <div className="w-56">
            <MatchCard match={thirdPlace} onClick={onMatchClick} />
          </div>
        </div>
      )}
    </div>
  )
}

function MatchCard({ match, onClick }: { match: Match; onClick?: (m: Match) => void }) {
  const isBye = match.status === 'WALKOVER'
  const e1Name = (!match.entry1 && isBye) ? 'BYE' : getEntryName(match.entry1)
  const e2Name = (!match.entry2 && isBye) ? 'BYE' : getEntryName(match.entry2)
  const isLive = match.status === 'LIVE'

  return (
    <button
      onClick={() => onClick?.(match)}
      className={cn(
        'w-52 border rounded-lg overflow-hidden text-left transition-shadow hover:shadow-md',
        isLive ? 'border-red-400 shadow-sm' : 'border-gray-200'
      )}
    >
      <div className={cn('px-2 py-0.5 text-xs font-medium', STATUS_COLORS[match.status])}>
        {match.bracketSlot ?? `R${match.round} M${match.matchNumber}`}
        {isLive && ' • LIVE'}
      </div>
      <EntryRow name={e1Name} isWinner={!!match.winnerId && match.winnerId === match.entry1Id} scores={match.scores} side="entry1" />
      <div className="border-t border-gray-100" />
      <EntryRow name={e2Name} isWinner={!!match.winnerId && match.winnerId === match.entry2Id} scores={match.scores} side="entry2" />
    </button>
  )
}

function EntryRow({
  name,
  isWinner,
  scores,
  side,
}: {
  name: string
  isWinner: boolean
  scores: Record<string, unknown> | null | undefined
  side: 'entry1' | 'entry2'
}) {
  const scoreDisplay = extractScore(scores, side)

  return (
    <div className={cn('flex items-center justify-between px-3 py-2', isWinner ? 'bg-green-50' : 'bg-white')}>
      <span className={cn('text-sm truncate max-w-[130px]', isWinner ? 'font-semibold text-green-800' : 'text-gray-700')}>
        {name}
      </span>
      {scoreDisplay != null && (
        <span className={cn('text-sm font-bold ml-2', isWinner ? 'text-green-700' : 'text-gray-600')}>
          {scoreDisplay}
        </span>
      )}
    </div>
  )
}

function extractScore(scores: Record<string, unknown> | null | undefined, side: string): string | null {
  if (!scores) return null
  const entry = scores[side] as Record<string, unknown> | undefined
  if (!entry) return null
  if (entry.goals != null) return String(entry.goals)
  if (entry.points != null) return String(entry.points)
  if (entry.gamesWon != null) return String(entry.gamesWon)
  if (entry.setsWon != null) return String(entry.setsWon)
  return null
}

function groupByRound(matches: Match[]): Record<number, Match[]> {
  return matches.reduce<Record<number, Match[]>>((acc, m) => {
    if (!acc[m.round]) acc[m.round] = []
    acc[m.round].push(m)
    return acc
  }, {})
}

function getRoundLabel(round: number, allRounds: number[]): string {
  const max = Math.max(...allRounds)
  const remaining = max - round
  if (remaining === 0) return 'Final'
  if (remaining === 1) return 'Semi-Finals'
  if (remaining === 2) return 'Quarter-Finals'
  return `Round ${round}`
}
