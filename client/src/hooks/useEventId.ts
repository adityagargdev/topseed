import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { tournamentApi } from '../api/tournaments'

/**
 * Returns [selectedEventId, setEventId] scoped to the current tournament URL.
 * Defaults to the first event alphabetically when no ?event= param is present.
 */
export function useEventId() {
  const { id: tournamentId } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: events } = useQuery({
    queryKey: ['tournament', tournamentId, 'events'],
    queryFn: () => tournamentApi.listEvents(tournamentId!),
    enabled: !!tournamentId,
  })

  const paramEventId = searchParams.get('event')
  // Prefer the URL param; fall back to the first event
  const selectedEventId = paramEventId ?? events?.[0]?.id ?? null

  const setEventId = (id: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('event', id)
      return next
    }, { replace: true })
  }

  return { events: events ?? [], selectedEventId, setEventId }
}
