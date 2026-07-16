import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { tournamentApi } from '../../../api/tournaments'
import { useEventId } from '../../../hooks/useEventId'
import { useAuthStore } from '../../../store/authStore'
import EventSelector from '../../../components/common/EventSelector'
import { getEntryName, cn } from '../../../lib/utils'
import LoadingSpinner from '../../../components/common/LoadingSpinner'
import { TournamentEntry } from '../../../types'

export default function Seedings() {
  const { id } = useParams<{ id: string }>()
  const { events, selectedEventId, setEventId } = useEventId()
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const { data: tournament } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => tournamentApi.get(id!),
    enabled: !!id,
  })

  const isAdmin = !!user && (user.id === tournament?.adminId || user.role === 'SUPER_ADMIN')

  const { data: entries, isLoading } = useQuery({
    queryKey: ['tournament', id, isAdmin ? 'entries' : 'seedings', selectedEventId],
    queryFn: () =>
      isAdmin
        ? tournamentApi.getEntries(id!, selectedEventId!)
        : tournamentApi.getSeedings(id!, selectedEventId!),
    enabled: !!id && !!selectedEventId,
  })

  const [seeds, setSeeds] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!entries) return
    const initial: Record<string, string> = {}
    for (const e of entries) initial[e.id] = e.seed != null ? String(e.seed) : ''
    setSeeds(initial)
    setSaved(false)
  }, [entries])

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = Object.entries(seeds)
        .map(([entryId, val]) => ({ entryId, seed: val !== '' ? Number(val) : null }))
      return tournamentApi.updateSeedings(id!, payload)
    },
    onSuccess: () => {
      setSaved(true)
      qc.invalidateQueries({ queryKey: ['tournament', id, 'seedings', selectedEventId] })
      qc.invalidateQueries({ queryKey: ['tournament', id, 'entries', selectedEventId] })
    },
  })

  return (
    <div>
      <EventSelector events={events} selectedId={selectedEventId} onChange={setEventId} />

      {!selectedEventId ? (
        <p className="mono-label text-tok-muted">No events found for this tournament.</p>
      ) : isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : !entries?.length ? (
        <div className="text-center py-16">
          <p className="mono-label text-tok-muted">No entries registered for this event yet.</p>
        </div>
      ) : isAdmin ? (
        <AdminSeedingEditor
          entries={entries}
          seeds={seeds}
          onSeedChange={(entryId, val) => { setSeeds(prev => ({ ...prev, [entryId]: val })); setSaved(false) }}
          onSave={() => saveMutation.mutate()}
          saving={saveMutation.isPending}
          saved={saved}
          error={saveMutation.isError ? 'Failed to save seeds.' : ''}
        />
      ) : (
        <PublicSeedingList entries={entries} />
      )}
    </div>
  )
}

function AdminSeedingEditor({
  entries, seeds, onSeedChange, onSave, saving, saved, error,
}: {
  entries: TournamentEntry[]; seeds: Record<string, string>
  onSeedChange: (id: string, val: string) => void
  onSave: () => void; saving: boolean; saved: boolean; error: string
}) {
  const sorted = [...entries].sort((a, b) => {
    const sa = seeds[a.id] !== '' ? Number(seeds[a.id]) : Infinity
    const sb = seeds[b.id] !== '' ? Number(seeds[b.id]) : Infinity
    return sa - sb
  })

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-tok-muted">Assign seed numbers. Leave blank for unseeded.</p>
        <button onClick={onSave} disabled={saving} className="btn-primary text-xs py-2">
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving…' : 'Save Seeds'}
        </button>
      </div>

      {error && <p className="glass rounded-xl px-4 py-2 text-sm text-red-500">{error}</p>}
      {saved && <p className="glass rounded-xl px-4 py-2 text-sm text-acc2">Seeds saved successfully.</p>}

      <div className="space-y-2">
        {sorted.map(entry => (
          <div key={entry.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
            <input
              type="number" min="1"
              value={seeds[entry.id] ?? ''}
              onChange={e => onSeedChange(entry.id, e.target.value)}
              placeholder="—"
              className={cn(
                'w-16 text-center text-lg font-bold glass rounded-lg py-1',
                'text-tok focus:outline-none focus:ring-2 ring-tok transition-shadow'
              )}
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-tok truncate">{getEntryName(entry)}</p>
              {entry.partner && <p className="mono-label text-tok-muted">Partner: {entry.partner.user.displayName}</p>}
              {entry.team    && <p className="mono-label text-tok-muted">Captain: {entry.team.captain.displayName}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PublicSeedingList({ entries }: { entries: TournamentEntry[] }) {
  const seeded = entries.filter(e => e.seed != null).sort((a, b) => a.seed! - b.seed!)
  if (!seeded.length) {
    return <p className="mono-label text-tok-muted py-16 text-center">No seedings have been set yet.</p>
  }
  return (
    <div className="max-w-lg space-y-2">
      <p className="mono-label text-tok font-semibold mb-4">Seedings</p>
      {seeded.map(entry => (
        <div key={entry.id} className="glass rounded-xl px-5 py-3 flex items-center gap-4">
          <span className="text-2xl font-bold text-acc1 w-10 text-center">{entry.seed}</span>
          <div>
            <p className="font-medium text-tok">{getEntryName(entry)}</p>
            {entry.partner && <p className="mono-label text-tok-muted">Partner: {entry.partner.user.displayName}</p>}
            {entry.team    && <p className="mono-label text-tok-muted">Captain: {entry.team.captain.displayName}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
