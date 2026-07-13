import { TournamentEvent } from '../../types'
import { cn, STATUS_COLORS } from '../../lib/utils'

interface Props {
  events: TournamentEvent[]
  selectedId: string | null
  onChange: (id: string) => void
}

const GENDER_LABEL: Record<string, string> = {
  MEN: "Men's", WOMEN: "Women's", MIXED: 'Mixed', OPEN: 'Open',
}

const TYPE_LABEL: Record<string, string> = {
  SINGLES: 'Singles', DOUBLES: 'Doubles', TEAM: 'Team',
}

export function eventDisplayName(event: TournamentEvent) {
  const parts: string[] = []
  if (event.ageGroup) parts.push(event.ageGroup)
  if (event.gender !== 'OPEN') parts.push(GENDER_LABEL[event.gender])
  parts.push(TYPE_LABEL[event.eventType])
  return event.name || parts.join(' ')
}

export default function EventSelector({ events, selectedId, onChange }: Props) {
  if (!events.length) return null

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {events.map(event => (
        <button
          key={event.id}
          onClick={() => onChange(event.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors',
            selectedId === event.id
              ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
              : 'bg-white border-gray-200 text-gray-700 hover:border-primary-300 hover:text-primary-700'
          )}
        >
          <span>{eventDisplayName(event)}</span>
          {event._count && (
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full',
              selectedId === event.id ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'
            )}>
              {event._count.entries}
            </span>
          )}
          <span className={cn('text-xs px-1.5 py-0.5 rounded-full', STATUS_COLORS[event.status])}>
            {event.status.replace(/_/g, ' ')}
          </span>
        </button>
      ))}
    </div>
  )
}
