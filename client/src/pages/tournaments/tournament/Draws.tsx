import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Shuffle, RefreshCw, AlertTriangle } from 'lucide-react'
import { tournamentApi } from '../../../api/tournaments'
import { useEventId } from '../../../hooks/useEventId'
import { useSocket, getSocket } from '../../../hooks/useSocket'
import { useAuthStore } from '../../../store/authStore'
import EventSelector from '../../../components/common/EventSelector'
import EliminationBracket from '../../../components/brackets/EliminationBracket'
import RoundRobinTable from '../../../components/brackets/RoundRobinTable'
import LoadingSpinner from '../../../components/common/LoadingSpinner'
import { Match } from '../../../types'

export default function Draws() {
  const { id } = useParams<{ id: string }>()
  const { events, selectedEventId, setEventId } = useEventId()
  const { user } = useAuthStore()
  const [confirmRegen, setConfirmRegen] = useState(false)
  const qc = useQueryClient()
  useSocket(id)

  const { data: tournament } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => tournamentApi.get(id!),
    enabled: !!id,
  })

  const selectedEvent = events.find(e => e.id === selectedEventId)

  const { data: matches, isLoading, refetch } = useQuery({
    queryKey: ['tournament', id, 'matches', selectedEventId],
    queryFn: () => tournamentApi.getMatches(id!, selectedEventId!),
    enabled: !!id && !!selectedEventId,
  })

  const { data: entries } = useQuery({
    queryKey: ['tournament', id, 'entries', selectedEventId],
    queryFn: () => tournamentApi.getEntries(id!, selectedEventId!),
    enabled: !!id && !!selectedEventId,
  })

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const handler = () => refetch()
    socket.on('score:update', handler)
    return () => { socket.off('score:update', handler) }
  }, [refetch])

  const isAdmin = !!user && (user.id === tournament?.adminId || user.role === 'SUPER_ADMIN')

  const generateMutation = useMutation({
    mutationFn: () => tournamentApi.generateFixtures(id!, selectedEventId!, 'auto'),
    onSuccess: () => {
      setConfirmRegen(false)
      qc.invalidateQueries({ queryKey: ['tournament', id, 'matches', selectedEventId] })
    },
  })

  const hasMatches  = (matches?.length ?? 0) > 0
  const entryCount  = entries?.length ?? 0

  return (
    <div>
      <EventSelector events={events} selectedId={selectedEventId} onChange={setEventId} />

      {/* Admin fixture panel */}
      {isAdmin && selectedEventId && (
        <div className="mb-6 glass rounded-2xl p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-semibold text-tok text-sm">Fixture Generation</p>
              <p className="mono-label text-tok-muted mt-0.5">
                {entryCount} {entryCount === 1 ? 'entry' : 'entries'} registered ·{' '}
                {selectedEvent?.format.replace(/_/g, ' ')} format
              </p>
            </div>

            {!hasMatches ? (
              <button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending || entryCount < 2}
                className="btn-primary text-sm"
              >
                <Shuffle className="h-4 w-4" />
                {generateMutation.isPending ? 'Generating…' : 'Generate Fixtures'}
              </button>
            ) : confirmRegen ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="glass inline-flex items-center gap-1 rounded-full px-2.5 py-1 mono-label text-orange-500">
                  <AlertTriangle className="h-3 w-3" /> This clears all existing match data.
                </span>
                <button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  className="inline-flex items-center gap-1.5 bg-orange-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:opacity-90 disabled:opacity-50"
                >
                  {generateMutation.isPending ? 'Regenerating…' : 'Confirm Regenerate'}
                </button>
                <button
                  onClick={() => setConfirmRegen(false)}
                  className="btn-ghost text-xs py-1.5 px-3"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmRegen(true)} className="btn-ghost text-sm">
                <RefreshCw className="h-4 w-4" /> Regenerate
              </button>
            )}
          </div>
          {generateMutation.isError && (
            <p className="mono-label text-red-500 mt-2">
              Failed to generate. Make sure there are at least 2 registered entries.
            </p>
          )}
        </div>
      )}

      {!selectedEventId ? (
        <p className="mono-label text-tok-muted">No events found for this tournament.</p>
      ) : isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : !matches?.length ? (
        <div className="text-center py-16">
          <p className="mono-label text-tok-muted">
            {isAdmin ? 'Use the panel above to generate fixtures.' : 'Fixtures have not been generated yet.'}
          </p>
        </div>
      ) : selectedEvent?.format === 'ROUND_ROBIN' ? (
        <RoundRobinTable
          entries={entries ?? []}
          matches={matches}
          scoringConfig={selectedEvent?.scoringConfig}
        />
      ) : (
        <EliminationBracket matches={matches as Match[]} />
      )}
    </div>
  )
}
