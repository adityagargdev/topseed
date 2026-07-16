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
import StatusPill from '../../../components/common/StatusPill'
import { cn, getEntryName, formatDateTime } from '../../../lib/utils'
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
  const grouped  = groupByDate(matches ?? [])
  const dates    = Object.keys(grouped).sort()

  return (
    <div className="space-y-4">
      <EventSelector events={events} selectedId={selectedEventId} onChange={setEventId} />

      <div className="flex items-center gap-3">
        <label className="mono-label text-tok-muted">Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="glass rounded-xl px-3 py-2 text-sm text-tok focus:outline-none focus:ring-2 ring-tok transition-shadow"
        />
        {selectedDate && (
          <button onClick={() => setSelectedDate('')} className="mono-label text-tok-muted hover:text-tok transition-colors">
            Clear
          </button>
        )}
      </div>

      {isAdmin && (
        <p className="mono-label text-tok-muted flex items-center gap-1">
          <Pencil className="h-3 w-3" /> Click any match to update score or schedule.
        </p>
      )}

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : !matches?.length ? (
        <div className="text-center py-16">
          <p className="mono-label text-tok-muted">No matches found.</p>
        </div>
      ) : dates.length > 0 ? (
        dates.map(date => (
          <div key={date}>
            <h3 className="mono-label text-tok-muted mb-3">
              {format(new Date(date), 'EEEE, d MMMM yyyy')}
            </h3>
            <div className="space-y-2">
              {grouped[date].map(m => (
                <MatchRow key={m.id} match={m} isAdmin={isAdmin} onEdit={setEditingMatch} />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="space-y-2">
          {matches.map(m => <MatchRow key={m.id} match={m} isAdmin={isAdmin} onEdit={setEditingMatch} />)}
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
        'glass rounded-xl p-4 transition-colors',
        isAdmin ? 'cursor-pointer hover:border-acc1/40' : ''
      )}
      onClick={() => isAdmin && onEdit(m)}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusPill status={m.status} />
          <span className="mono-label text-tok-muted">{m.bracketSlot}</span>
          {m.event && <span className="mono-label text-tok-muted">· {m.event.name}</span>}
        </div>
        <div className="flex items-center gap-2">
          {m.scheduledAt && <span className="mono-label text-tok-muted">{formatDateTime(m.scheduledAt)}</span>}
          {isAdmin && <Pencil className="h-3.5 w-3.5 text-tok-muted" />}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <EntryBlock name={getEntryName(m.entry1)} isWinner={!!m.winnerId && m.winnerId === m.entry1Id} score={getScore(m.scores, 'entry1')} />
        <span className="mono-label text-tok-muted shrink-0">vs</span>
        <EntryBlock name={getEntryName(m.entry2)} isWinner={!!m.winnerId && m.winnerId === m.entry2Id} score={getScore(m.scores, 'entry2')} right />
      </div>
    </div>
  )
}

function EntryBlock({ name, isWinner, score, right }: { name: string; isWinner: boolean; score: string | null; right?: boolean }) {
  return (
    <div className={cn('flex-1 flex items-center gap-3', right ? 'flex-row-reverse text-right' : '')}>
      <span className={cn('font-medium text-sm truncate', isWinner ? 'text-acc1' : 'text-tok')}>{name}</span>
      {score != null && <span className={cn('text-xl font-bold shrink-0', isWinner ? 'text-acc1' : 'text-tok')}>{score}</span>}
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
