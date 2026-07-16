import { Link } from 'react-router-dom'
import { Calendar, Users } from 'lucide-react'
import { Tournament } from '../../types'
import { cn, formatDate, STATUS_DOT, STATUS_LABEL, STATUS_TEXT } from '../../lib/utils'

interface Props {
  tournament: Tournament
}

export default function TournamentCard({ tournament: t }: Props) {
  const isLive = t.status === 'IN_PROGRESS'

  return (
    <Link
      to={`/tournaments/${t.id}/organization`}
      className={cn(
        'group glass rounded-2xl overflow-hidden block',
        'hover:border-acc1 transition-colors duration-200'
      )}
    >
      {/* Accent top stripe based on status */}
      <div
        className="h-0.5 w-full"
        style={{
          background: isLive
            ? 'var(--accent-1)'
            : t.status === 'REGISTRATION_OPEN'
              ? 'var(--accent-2)'
              : 'var(--border)',
        }}
      />

      <div className="p-4">
        {/* Sport + status */}
        <div className="flex items-center justify-between mb-3">
          <span className="mono-label text-tok-muted">
            {t.sport.icon ? `${t.sport.icon} ${t.sport.name}` : t.sport.name}
          </span>
          <span className={cn('inline-flex items-center gap-1.5 mono-label', STATUS_TEXT[t.status] ?? 'text-gray-400')}>
            <span
              className={cn(
                'h-1.5 w-1.5 shrink-0 rounded-full',
                STATUS_DOT[t.status] ?? 'bg-gray-400',
                isLive && 'animate-pulse-slow'
              )}
            />
            {STATUS_LABEL[t.status] ?? t.status.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Name */}
        <h3 className="font-semibold text-tok text-sm leading-snug line-clamp-2 mb-3 group-hover:text-acc1 transition-colors">
          {t.name}
        </h3>

        {/* Meta */}
        <div className="flex items-center gap-4 text-tok-muted">
          <span className="mono-label inline-flex items-center gap-1">
            <Users className="h-3 w-3 shrink-0" />
            {t._count?.events ?? 0} events
          </span>
          {t.startDate && (
            <span className="mono-label inline-flex items-center gap-1">
              <Calendar className="h-3 w-3 shrink-0" />
              {formatDate(t.startDate)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
