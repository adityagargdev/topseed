import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Globe, Lock, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { tournamentApi } from '../../../api/tournaments'
import { useAuthStore } from '../../../store/authStore'
import { TournamentEvent } from '../../../types'
import { formatDate } from '../../../lib/utils'
import { eventDisplayName } from '../../../components/common/EventSelector'
import EventForm from '../../../components/common/EventForm'
import LoadingSpinner from '../../../components/common/LoadingSpinner'
import StatusPill from '../../../components/common/StatusPill'

export default function Organization() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [editingEvent, setEditingEvent] = useState<TournamentEvent | null>(null)

  const { data: tournament, isLoading } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => tournamentApi.get(id!),
    enabled: !!id,
  })

  const { data: events } = useQuery({
    queryKey: ['tournament', id, 'events'],
    queryFn: () => tournamentApi.listEvents(id!),
    enabled: !!id,
  })

  const isAdmin = user && (user.id === tournament?.adminId || user.role === 'SUPER_ADMIN')

  const createMutation = useMutation({
    mutationFn: (data: Partial<TournamentEvent>) => tournamentApi.createEvent(id!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tournament', id, 'events'] }); setShowAddEvent(false) },
  })
  const updateMutation = useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: Partial<TournamentEvent> }) =>
      tournamentApi.updateEvent(id!, eventId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tournament', id, 'events'] }); setEditingEvent(null) },
  })
  const deleteMutation = useMutation({
    mutationFn: (eventId: string) => tournamentApi.deleteEvent(id!, eventId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tournament', id, 'events'] }),
  })
  const statusMutation = useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: string }) =>
      tournamentApi.updateEventStatus(id!, eventId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tournament', id, 'events'] }),
  })

  if (isLoading) return <LoadingSpinner className="py-16" />
  if (!tournament) return <p className="text-red-500 mono-label">Tournament not found.</p>

  const infoRows: { label: string; value: React.ReactNode }[] = [
    { label: 'Organizer', value: tournament.organizerName ?? tournament.admin.displayName },
    tournament.venue          ? { label: 'Venue',    value: tournament.venue }                                      : null,
    { label: 'Dates',     value: `${formatDate(tournament.startDate)} — ${formatDate(tournament.endDate)}` },
    tournament.address        ? { label: 'Address',  value: tournament.address }                                    : null,
    tournament.prizeMoney     ? { label: 'Prize',    value: tournament.prizeMoney }                                 : null,
    tournament.registrationDeadline
      ? { label: 'Reg. Deadline', value: formatDate(tournament.registrationDeadline) }
      : null,
    tournament.locationUrl
      ? { label: 'Location', value: (
          <a href={tournament.locationUrl} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-acc1 hover:opacity-75 transition-opacity">
            View on map <ExternalLink className="h-3 w-3" />
          </a>
        )}
      : null,
  ].filter(Boolean) as { label: string; value: React.ReactNode }[]

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ── Header ── */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-4xl leading-none mt-1">{tournament.sport.icon ?? '🏆'}</span>
            <div>
              <p className="mono-label text-tok-muted mb-0.5">{tournament.sport.name}</p>
              <h1 className="font-display font-bold text-2xl text-tok tracking-tight">
                {tournament.name}
              </h1>
              {tournament.description && (
                <p className="text-tok-muted text-sm mt-1 leading-relaxed">{tournament.description}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <StatusPill status={tournament.status} />
            <span className="mono-label text-tok-muted inline-flex items-center gap-1">
              {tournament.isPublic ? <><Globe className="h-3 w-3" /> Public</> : <><Lock className="h-3 w-3" /> Private</>}
            </span>
          </div>
        </div>
      </div>

      {/* ── Info grid ── */}
      <div className="grid gap-3 sm:grid-cols-2">
        {infoRows.map((row, i) => (
          <div key={i} className="glass rounded-xl p-4">
            <p className="mono-label text-tok-muted mb-1">{row.label}</p>
            <div className="flex items-center gap-2 text-sm font-medium text-tok">{row.value}</div>
          </div>
        ))}
      </div>

      {/* ── Events ── */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="mono-label text-tok font-semibold">Events</p>
          {isAdmin && !showAddEvent && (
            <button
              onClick={() => setShowAddEvent(true)}
              className="inline-flex items-center gap-1.5 btn-primary text-xs py-1.5 px-3"
            >
              <Plus className="h-3.5 w-3.5" /> Add Event
            </button>
          )}
        </div>

        {showAddEvent && (
          <div className="mb-4 glass rounded-xl p-4">
            <p className="mono-label text-tok-muted mb-4">New Event</p>
            <EventForm
              sportName={tournament.sport.name}
              onSubmit={async (data) => { await createMutation.mutateAsync(data) }}
              onCancel={() => setShowAddEvent(false)}
              loading={createMutation.isPending}
            />
          </div>
        )}

        {!events?.length ? (
          <div className="py-8 border border-dashed border-tok rounded-xl text-center">
            <p className="mono-label text-tok-muted">
              {isAdmin ? 'No events yet — click "Add Event" to create one' : 'No events added yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map(event => (
              <div key={event.id}>
                {editingEvent?.id === event.id ? (
                  <div className="glass rounded-xl p-4">
                    <EventForm
                      initial={event}
                      sportName={tournament.sport.name}
                      onSubmit={async (data) => { await updateMutation.mutateAsync({ eventId: event.id, data }) }}
                      onCancel={() => setEditingEvent(null)}
                      loading={updateMutation.isPending}
                    />
                  </div>
                ) : (
                  <div className="glass rounded-xl px-4 py-3 flex items-center justify-between hover:border-acc1/30 transition-colors">
                    <div>
                      <p className="font-medium text-tok text-sm">{eventDisplayName(event)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="mono-label text-tok-muted">{event.format.replace(/_/g, ' ')}</span>
                        {event.ageGroup && <span className="mono-label text-tok-muted">· {event.ageGroup}</span>}
                        {event._count && <span className="mono-label text-tok-muted">· {event._count.entries} entries</span>}
                        {!isAdmin && <StatusPill status={event.status} className="ml-1" />}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={event.status}
                          onChange={e => statusMutation.mutate({ eventId: event.id, status: e.target.value })}
                          className="glass rounded-lg px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-tok focus:outline-none"
                        >
                          {['DRAFT','REGISTRATION_OPEN','REGISTRATION_CLOSED','IN_PROGRESS','COMPLETED','CANCELLED'].map(s => (
                            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                        <button onClick={() => setEditingEvent(event)}
                          className="p-1.5 rounded-lg text-tok-muted hover:text-tok hover:bg-tok-surface transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { if (confirm('Delete this event and all its matches/entries?')) deleteMutation.mutate(event.id) }}
                          className="p-1.5 rounded-lg text-tok-muted hover:text-red-500 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
