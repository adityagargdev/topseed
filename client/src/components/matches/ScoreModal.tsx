import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { X, Clock, Trophy } from 'lucide-react'
import { matchApi } from '../../api/matches'
import { Match } from '../../types'
import { getEntryName, cn } from '../../lib/utils'

interface Props {
  match: Match
  onClose: () => void
  onSaved: () => void
}

const SCORE_KEYS = ['goals', 'points', 'runs', 'gamesWon', 'setsWon']

function readScore(scores: Record<string, unknown> | null | undefined, side: string): string {
  if (!scores) return ''
  const entry = scores[side] as Record<string, unknown> | undefined
  if (!entry) return ''
  for (const key of SCORE_KEYS) {
    if (entry[key] != null) return String(entry[key])
  }
  return ''
}

function detectScoreKey(scores: Record<string, unknown> | null | undefined): string {
  if (!scores) return 'points'
  const entry = (scores.entry1 ?? scores.entry2) as Record<string, unknown> | undefined
  if (entry) {
    for (const key of SCORE_KEYS) {
      if (entry[key] != null) return key
    }
  }
  return 'points'
}

type WinnerChoice = 'entry1' | 'entry2' | 'draw' | ''

export default function ScoreModal({ match, onClose, onSaved }: Props) {
  const scoreKey = detectScoreKey(match.scores)

  const [score1, setScore1] = useState(readScore(match.scores, 'entry1'))
  const [score2, setScore2] = useState(readScore(match.scores, 'entry2'))
  const [winner, setWinner] = useState<WinnerChoice>(() => {
    if (!match.winnerId) return ''
    return match.winnerId === match.entry1Id ? 'entry1' : 'entry2'
  })
  const [scheduledAt, setScheduledAt] = useState(
    match.scheduledAt ? match.scheduledAt.slice(0, 16) : ''
  )
  const [error, setError] = useState('')

  const scoreMutation = useMutation({
    mutationFn: ({ scores, winnerId }: { scores: Record<string, unknown>; winnerId?: string | null }) =>
      matchApi.updateScore(match.id, scores, winnerId),
    onSuccess: () => { onSaved(); onClose() },
    onError: () => setError('Failed to save score. Check that you are the tournament admin.'),
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) => matchApi.updateStatus(match.id, status),
    onSuccess: () => { onSaved(); onClose() },
    onError: () => setError('Failed to update status.'),
  })

  const scheduleMutation = useMutation({
    mutationFn: (at: string) => matchApi.schedule(match.id, new Date(at).toISOString()),
    onSuccess: () => onSaved(),
    onError: () => setError('Failed to schedule match.'),
  })

  const deriveWinner = (s1: string, s2: string): WinnerChoice => {
    if (s1 === '' || s2 === '') return ''
    const n1 = Number(s1), n2 = Number(s2)
    if (n1 > n2) return 'entry1'
    if (n2 > n1) return 'entry2'
    return 'draw'
  }

  const handleScore1Change = (val: string) => {
    setScore1(val)
    setWinner(deriveWinner(val, score2))
  }

  const handleScore2Change = (val: string) => {
    setScore2(val)
    setWinner(deriveWinner(score1, val))
  }

  const handleSave = () => {
    setError('')
    const scores = {
      entry1: { [scoreKey]: score1 !== '' ? Number(score1) : null },
      entry2: { [scoreKey]: score2 !== '' ? Number(score2) : null },
    }
    const winnerId =
      winner === 'entry1' ? (match.entry1Id ?? null)
      : winner === 'entry2' ? (match.entry2Id ?? null)
      : null
    scoreMutation.mutate({ scores, winnerId })
  }

  const entry1Name = getEntryName(match.entry1)
  const entry2Name = getEntryName(match.entry2)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <p className="text-xs text-gray-500 font-medium">{match.bracketSlot ?? `R${match.round} M${match.matchNumber}`}</p>
            <p className="font-semibold text-gray-900">{match.event?.name ?? 'Match'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          {/* Score inputs */}
          <div className="flex items-center gap-3">
            <div className="flex-1 text-center space-y-2">
              <p className="text-sm font-semibold text-gray-900 truncate">{entry1Name}</p>
              <input
                type="number"
                min="0"
                value={score1}
                onChange={e => handleScore1Change(e.target.value)}
                placeholder="—"
                className="w-full text-center text-3xl font-bold border-2 border-gray-200 rounded-xl py-3 focus:outline-none focus:border-primary-500"
              />
            </div>
            <span className="text-gray-400 font-bold text-lg shrink-0">vs</span>
            <div className="flex-1 text-center space-y-2">
              <p className="text-sm font-semibold text-gray-900 truncate">{entry2Name}</p>
              <input
                type="number"
                min="0"
                value={score2}
                onChange={e => handleScore2Change(e.target.value)}
                placeholder="—"
                className="w-full text-center text-3xl font-bold border-2 border-gray-200 rounded-xl py-3 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          {/* Winner selector */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Winner</p>
            <div className="flex gap-2">
              {([
                { value: 'entry1' as const, label: entry1Name },
                { value: 'draw' as const, label: 'Draw' },
                { value: 'entry2' as const, label: entry2Name },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setWinner(opt.value)}
                  className={cn(
                    'flex-1 py-2 px-1 rounded-lg text-xs font-medium border-2 transition-colors',
                    winner === opt.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  )}
                >
                  {opt.value !== 'draw' ? (
                    <span className="flex items-center justify-center gap-1">
                      <Trophy className="h-3 w-3 shrink-0" />
                      <span className="truncate">{opt.label}</span>
                    </span>
                  ) : opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Schedule Time (optional)</p>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={() => scheduledAt && scheduleMutation.mutate(scheduledAt)}
                disabled={!scheduledAt || scheduleMutation.isPending}
                title="Save time"
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 disabled:opacity-40"
              >
                <Clock className="h-4 w-4" />
              </button>
            </div>
            {scheduleMutation.isSuccess && <p className="text-xs text-green-600 mt-1">Time saved.</p>}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 px-6 pb-5">
          <button
            onClick={() => statusMutation.mutate('LIVE')}
            disabled={match.status === 'LIVE' || statusMutation.isPending}
            className="px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-40 shrink-0"
          >
            Mark Live
          </button>
          <button
            onClick={() => statusMutation.mutate('WALKOVER')}
            disabled={statusMutation.isPending}
            className="px-3 py-2 border border-orange-300 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-50 disabled:opacity-40 shrink-0"
          >
            Walkover
          </button>
          <button
            onClick={handleSave}
            disabled={scoreMutation.isPending || winner === ''}
            className="flex-1 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:opacity-50"
          >
            {scoreMutation.isPending ? 'Saving…' : 'Save Score'}
          </button>
        </div>
      </div>
    </div>
  )
}
