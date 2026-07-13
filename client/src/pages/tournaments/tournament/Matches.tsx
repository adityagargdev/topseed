import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Pencil } from 'lucide-react'
import { tournamentApi } from '../../../api/tournaments'
import { useEventId } from '../../../hooks/useEventId'
import { useSocket, getSocket } from '../../../hooks/useSocket'
import { useAuthStore } from '../../../store/authStore'
import EventSelector from '../../../components/common/EventSelector'
import ScoreModal from '../../../components/matches/ScoreModal'
import { cn, getEntryName, STATUS_COLORS, formatDateTime } from '../../../lib/utils'
import { Match } from '../../../types'
import LoadingSpinner from '../../../components/common/LoadingSpinner'

export default function Matches() {
  const { id } = useParams<{ id: string }>()
  const { events, selectedEventId, setEventId } = useEventId()
  const { user } = useAuthStore()
  const [selectedDate, setSelectedDate] = useState('')
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  useSocket(id)

  const { data: tournament } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => tournamentApi.get(id!),
    enabled: !!id,
  })

  const { data: matches, isLoading, refetch } = useQuery({
    queryKey: ['tournament', id, 'matches', selectedEventId, selectedDate],
    queryFn: () => tournamentApi.getMatches(id!, selectedEventId ?? undefined, selectedDate || undefined),
    enabled: !!id,
  })

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const handler = () => refetch()
    socket.on('score:update', handler)
    socket.on('match:status', handler)
    return () => { socket.off('score:update', handler); socket.off('match:status', handler) }
  }, [refetch])

  const isAdmin = !!user && (user.id === tournament?.adminId || user.role === 'SUPER_ADMIN')

  const grouped = groupByDate(matches ?? [])
  const dates = Object.keys(grouped).sort()

  return (
    <div className="space-y-4">
      <EventSelector events={events} selectedId={selectedEventId} onChange={setEventId} />

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {selectedDate && (
          <button onClick={() => setSelectedDate('')} className="text-xs text-gray-500 hover:text-gray-700">Clear</button>
        )}
      </div>

      {isAdmin && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Pencil className="h-3 w-3" /> Click any match to update score or schedule.
        </p>
      )}

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : !matches?.length ? (
        <div className="text-center py-16 text-gray-500">No matches found.</div>
      ) : dates.length > 0 ? (
        dates.map(date => (
          <div key={date}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {format(new Date(date), 'EEEE, d MMMM yyyy')}
            </h3>
            <div className="space-y-3">
              {grouped[date].map(m => (
                <MatchRow key={m.id} match={m} isAdmin={isAdmin} onEdit={setEditingMatch} />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="space-y-3">
          {matches.map(m => (
            <MatchRow key={m.id} match={m} isAdmin={isAdmin} onEdit={setEditingMatch} />
          ))}
        </div>
      )}

      {editingMatch && (
        <ScoreModal
          match={editingMatch}
          onClose={() => setEditingMatch(null)}
          onSaved={() => { refetch(); setEditingMatch(null) }}
        />
      )}
    </div>
  )
}

function MatchRow({ match: m, isAdmin, onEdit }: { match: Match; isAdmin: boolean; onEdit: (m: Match) => void }) {
  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-xl p-4 transition-shadow',
        isAdmin ? 'cursor-pointer hover:shadow-md hover:border-primary-200' : ''
      )}
      onClick={() => isAdmin && onEdit(m)}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[m.status])}>
            {m.status}
          </span>
          <span className="text-xs text-gray-400">{m.bracketSlot}</span>
          {m.event && <span className="text-xs text-gray-400">· {m.event.name}</span>}
        </div>
        <div className="flex items-center gap-2">
          {m.scheduledAt && <span className="text-xs text-gray-500">{formatDateTime(m.scheduledAt)}</span>}
          {isAdmin && <Pencil className="h-3.5 w-3.5 text-gray-400" />}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <EntryBlock name={getEntryName(m.entry1)} isWinner={!!m.winnerId && m.winnerId === m.entry1Id} score={getScore(m.scores, 'entry1')} />
        <span className="text-gray-400 font-medium text-sm shrink-0">vs</span>
        <EntryBlock name={getEntryName(m.entry2)} isWinner={!!m.winnerId && m.winnerId === m.entry2Id} score={getScore(m.scores, 'entry2')} right />
      </div>
    </div>
  )
}

function EntryBlock({ name, isWinner, score, right }: { name: string; isWinner: boolean; score: string | null; right?: boolean }) {
  return (
    <div className={cn('flex-1 flex items-center gap-3', right ? 'flex-row-reverse text-right' : '')}>
      <span className={cn('font-medium text-sm truncate', isWinner ? 'text-green-700' : 'text-gray-900')}>{name}</span>
      {score != null && <span className={cn('text-xl font-bold shrink-0', isWinner ? 'text-green-700' : 'text-gray-700')}>{score}</span>}
    </div>
  )
}

function getScore(scores: Record<string, unknown> | null | undefined, side: string): string | null {
  if (!scores) return null
  const e = scores[side] as Record<string, unknown> | undefined
  if (!e) return null
  for (const key of ['goals', 'points', 'runs', 'gamesWon', 'setsWon']) {
    if (e[key] != null) return String(e[key])
  }
  return null
}

function groupByDate(matches: Match[]) {
  const out: Record<string, Match[]> = {}
  for (const m of matches) {
    if (!m.scheduledAt) continue
    const key = m.scheduledAt.slice(0, 10)
    if (!out[key]) out[key] = []
    out[key].push(m)
  }
  return out
}
