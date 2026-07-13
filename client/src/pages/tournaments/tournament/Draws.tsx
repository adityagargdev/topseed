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

  const hasMatches = (matches?.length ?? 0) > 0
  const entryCount = entries?.length ?? 0

  return (
    <div>
      <EventSelector events={events} selectedId={selectedEventId} onChange={setEventId} />

      {/* Admin fixture generation panel */}
      {isAdmin && selectedEventId && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-800">Fixture Generation</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {entryCount} {entryCount === 1 ? 'entry' : 'entries'} registered ·{' '}
                {selectedEvent?.format.replace(/_/g, ' ')} format
              </p>
            </div>

            {!hasMatches ? (
              <button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending || entryCount < 2}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                <Shuffle className="h-4 w-4" />
                {generateMutation.isPending ? 'Generating…' : 'Generate Fixtures'}
              </button>
            ) : confirmRegen ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded-lg">
                  <AlertTriangle className="h-3 w-3" /> This clears all existing match data.
                </span>
                <button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-medium hover:bg-orange-700 disabled:opacity-50"
                >
                  {generateMutation.isPending ? 'Regenerating…' : 'Confirm Regenerate'}
                </button>
                <button
                  onClick={() => setConfirmRegen(false)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmRegen(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </button>
            )}
          </div>
          {generateMutation.isError && (
            <p className="text-xs text-red-600 mt-2">Failed to generate fixtures. Make sure there are at least 2 registered entries.</p>
          )}
        </div>
      )}

      {!selectedEventId ? (
        <p className="text-gray-500 text-sm">No events found for this tournament.</p>
      ) : isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : !matches?.length ? (
        <div className="text-center py-16">
          <p className="text-gray-500">
            {isAdmin ? 'Use the panel above to generate fixtures.' : 'Fixtures have not been generated for this event yet.'}
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
