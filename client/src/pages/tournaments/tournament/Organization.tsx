import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, Calendar, Trophy, Globe, Lock, Plus, Pencil, Trash2 } from 'lucide-react'
import { tournamentApi } from '../../../api/tournaments'
import { useAuthStore } from '../../../store/authStore'
import { TournamentEvent } from '../../../types'
import { cn, formatDate, STATUS_COLORS } from '../../../lib/utils'
import { eventDisplayName } from '../../../components/common/EventSelector'
import EventForm from '../../../components/common/EventForm'
import LoadingSpinner from '../../../components/common/LoadingSpinner'

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
  if (!tournament) return <p className="text-red-500">Tournament not found.</p>

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{tournament.sport.icon ?? '🏆'}</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{tournament.name}</h1>
              <p className="text-gray-500">{tournament.sport.name}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={cn('text-xs font-medium px-3 py-1 rounded-full', STATUS_COLORS[tournament.status])}>
              {tournament.status.replace(/_/g, ' ')}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              {tournament.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              {tournament.isPublic ? 'Public' : 'Private'}
            </span>
          </div>
        </div>
        {tournament.description && <p className="text-gray-700 text-sm">{tournament.description}</p>}
      </div>

      {/* Info cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard label="Organizer" value={tournament.organizerName ?? tournament.admin.displayName} />
        {tournament.venue && <InfoCard label="Venue" value={tournament.venue} />}
        <InfoCard label="Dates" icon={<Calendar className="h-4 w-4 text-gray-400" />}
          value={`${formatDate(tournament.startDate)} – ${formatDate(tournament.endDate)}`} />
        {tournament.address && <InfoCard label="Address" icon={<MapPin className="h-4 w-4 text-gray-400" />} value={tournament.address} />}
        {tournament.prizeMoney && <InfoCard label="Prize Money" icon={<Trophy className="h-4 w-4 text-gray-400" />} value={tournament.prizeMoney} />}
        {tournament.registrationDeadline && <InfoCard label="Registration Deadline" value={formatDate(tournament.registrationDeadline)} />}
        {tournament.locationUrl && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">Location</p>
            <a href={tournament.locationUrl} target="_blank" rel="noreferrer" className="text-sm text-primary-600 hover:underline">View on map</a>
          </div>
        )}
      </div>

      {/* Events section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 text-lg">Events</h2>
          {isAdmin && !showAddEvent && (
            <button
              onClick={() => setShowAddEvent(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" /> Add Event
            </button>
          )}
        </div>

        {showAddEvent && (
          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">New Event</h3>
            <EventForm
              sportName={tournament.sport.name}
              onSubmit={async (data) => { await createMutation.mutateAsync(data) }}
              onCancel={() => setShowAddEvent(false)}
              loading={createMutation.isPending}
            />
          </div>
        )}

        {!events?.length ? (
          <p className="text-gray-500 text-sm">No events added yet.{isAdmin ? ' Click "Add Event" to create one.' : ''}</p>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <div key={event.id}>
                {editingEvent?.id === event.id ? (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <EventForm
                      initial={event}
                      sportName={tournament.sport.name}
                      onSubmit={async (data) => { await updateMutation.mutateAsync({ eventId: event.id, data }) }}
                      onCancel={() => setEditingEvent(null)}
                      loading={updateMutation.isPending}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">{eventDisplayName(event)}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{event.format.replace(/_/g, ' ')}</span>
                        {event.ageGroup && <span>· {event.ageGroup}</span>}
                        {event._count && <span>· {event._count.entries} entries</span>}
                        <span className={cn('px-1.5 py-0.5 rounded-full', STATUS_COLORS[event.status])}>
                          {event.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={event.status}
                          onChange={e => statusMutation.mutate({ eventId: event.id, status: e.target.value })}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
                        >
                          {['DRAFT','REGISTRATION_OPEN','REGISTRATION_CLOSED','IN_PROGRESS','COMPLETED','CANCELLED'].map(s => (
                            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                        <button onClick={() => setEditingEvent(event)} className="p-1.5 hover:bg-gray-200 rounded-lg">
                          <Pencil className="h-4 w-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => { if (confirm('Delete this event and all its matches/entries?')) deleteMutation.mutate(event.id) }}
                          className="p-1.5 hover:bg-red-100 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
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

function InfoCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  )
}
