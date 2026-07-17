import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Shuffle, RefreshCw, AlertTriangle, PenLine, X } from 'lucide-react'
import { tournamentApi } from '../../../api/tournaments'
import { useEventId } from '../../../hooks/useEventId'
import { useSocket, getSocket } from '../../../hooks/useSocket'
import { useAuthStore } from '../../../store/authStore'
import EventSelector from '../../../components/common/EventSelector'
import EliminationBracket from '../../../components/brackets/EliminationBracket'
import RoundRobinTable from '../../../components/brackets/RoundRobinTable'
import LoadingSpinner from '../../../components/common/LoadingSpinner'
import { Match, TournamentEntry } from '../../../types'
import { getEntryName, cn } from '../../../lib/utils'

export default function Draws() {
  const { id } = useParams<{ id: string }>()
  const { events, selectedEventId, setEventId } = useEventId()
  const { user } = useAuthStore()
  const [confirmRegen, setConfirmRegen] = useState(false)
  const [showCustomDraw, setShowCustomDraw] = useState(false)
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

  const manualDrawMutation = useMutation({
    mutationFn: (pairs: [string, string][]) =>
      tournamentApi.generateFixtures(id!, selectedEventId!, 'manual', pairs.map((pair, i) => ({
        round: 1,
        matchNumber: i + 1,
        entry1Id: pair[0],
        entry2Id: pair[1],
      }))),
    onSuccess: () => {
      setShowCustomDraw(false)
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
        <div className="mb-6 glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-semibold text-tok text-sm">Fixture Generation</p>
              <p className="mono-label text-tok-muted mt-0.5">
                {entryCount} {entryCount === 1 ? 'entry' : 'entries'} registered ·{' '}
                {selectedEvent?.format.replace(/_/g, ' ')} format
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Auto-generate */}
              {!hasMatches ? (
                <button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending || entryCount < 2}
                  className="btn-primary text-sm"
                >
                  <Shuffle className="h-4 w-4" />
                  {generateMutation.isPending ? 'Generating…' : 'Auto Generate'}
                </button>
              ) : confirmRegen ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="glass inline-flex items-center gap-1 rounded-full px-2.5 py-1 mono-label text-orange-500">
                    <AlertTriangle className="h-3 w-3" /> Clears all match data.
                  </span>
                  <button
                    onClick={() => generateMutation.mutate()}
                    disabled={generateMutation.isPending}
                    className="inline-flex items-center gap-1.5 bg-orange-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:opacity-90 disabled:opacity-50"
                  >
                    {generateMutation.isPending ? 'Regenerating…' : 'Confirm'}
                  </button>
                  <button onClick={() => setConfirmRegen(false)} className="btn-ghost text-xs py-1.5 px-3">
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmRegen(true)} className="btn-ghost text-sm">
                  <RefreshCw className="h-4 w-4" /> Regenerate
                </button>
              )}

              {/* Custom draw toggle */}
              {entryCount >= 2 && (
                <button
                  onClick={() => setShowCustomDraw(v => !v)}
                  className={cn('btn-ghost text-sm', showCustomDraw && 'ring-2 ring-tok')}
                >
                  <PenLine className="h-4 w-4" />
                  Custom Draw
                </button>
              )}
            </div>
          </div>

          {generateMutation.isError && (
            <p className="mono-label text-red-500">
              Failed to generate. Make sure there are at least 2 registered entries.
            </p>
          )}

          {showCustomDraw && (
            <CustomDrawPanel
              entries={entries ?? []}
              isPending={manualDrawMutation.isPending}
              error={manualDrawMutation.error?.message}
              onSubmit={pairs => manualDrawMutation.mutate(pairs)}
              onCancel={() => setShowCustomDraw(false)}
            />
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

function CustomDrawPanel({
  entries, isPending, error, onSubmit, onCancel,
}: {
  entries: TournamentEntry[]
  isPending: boolean
  error?: string
  onSubmit: (pairs: [string, string][]) => void
  onCancel: () => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [pairs, setPairs] = useState<[string, string][]>([])

  const pairedIds = new Set(pairs.flat())
  const pool = entries.filter(e => !pairedIds.has(e.id))

  function handleChipClick(entryId: string) {
    if (!selected) {
      setSelected(entryId)
    } else if (selected === entryId) {
      setSelected(null)
    } else {
      setPairs(prev => [...prev, [selected, entryId]])
      setSelected(null)
    }
  }

  function removePair(index: number) {
    setPairs(prev => prev.filter((_, i) => i !== index))
  }

  const entryMap = Object.fromEntries(entries.map(e => [e.id, e]))

  return (
    <div className="border-t border-tok pt-3 space-y-4">
      <p className="mono-label text-tok-muted">
        Click two players to pair them into a match. Pairs become Round 1 fixtures.
      </p>

      {/* Entry pool */}
      {pool.length > 0 && (
        <div className="space-y-1.5">
          <p className="mono-label text-tok-muted text-xs">Available</p>
          <div className="flex flex-wrap gap-2">
            {pool.map(entry => (
              <button
                key={entry.id}
                onClick={() => handleChipClick(entry.id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                  selected === entry.id
                    ? 'bg-acc1 text-white border-acc1'
                    : 'glass text-tok border-transparent hover:border-acc1/50'
                )}
              >
                {getEntryName(entry)}
                {selected === entry.id && <span className="ml-1 opacity-75">← select opponent</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Paired matches */}
      {pairs.length > 0 && (
        <div className="space-y-1.5">
          <p className="mono-label text-tok-muted text-xs">Matches</p>
          <div className="space-y-2">
            {pairs.map((pair, i) => (
              <div key={i} className="flex items-center gap-2 glass rounded-xl px-3 py-2">
                <span className="mono-label text-tok-muted w-12 shrink-0">R1 M{i + 1}</span>
                <span className="text-sm font-medium text-tok flex-1">
                  {getEntryName(entryMap[pair[0]])} <span className="text-tok-muted mx-1">vs</span> {getEntryName(entryMap[pair[1]])}
                </span>
                <button onClick={() => removePair(i)} className="text-tok-muted hover:text-red-500 transition-colors">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BYE notice for unpaired entries */}
      {pool.length === 1 && (
        <p className="mono-label text-amber-500">
          {getEntryName(pool[0])} will receive a BYE (unpaired). You can leave them out or pair them with a dummy.
        </p>
      )}

      {error && <p className="mono-label text-red-500">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={() => onSubmit(pairs)}
          disabled={isPending || pairs.length === 0}
          className="btn-primary text-sm"
        >
          {isPending ? 'Creating…' : `Create Draw (${pairs.length} match${pairs.length !== 1 ? 'es' : ''})`}
        </button>
        <button onClick={onCancel} className="btn-ghost text-sm">Cancel</button>
      </div>
    </div>
  )
}
