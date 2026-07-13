import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Trophy, Users, Calendar, ChevronRight, Zap } from 'lucide-react'
import { tournamentApi } from '../api/tournaments'
import { Tournament } from '../types'
import { cn, formatDate, STATUS_COLORS } from '../lib/utils'
import LoadingSpinner from '../components/common/LoadingSpinner'

export default function Home() {
  const { data: tournaments, isLoading } = useQuery({
    queryKey: ['tournaments', 'recent'],
    queryFn: () => tournamentApi.list(),
  })

  const live = tournaments?.filter(t => t.status === 'IN_PROGRESS') ?? []
  const upcoming = tournaments?.filter(t => t.status === 'REGISTRATION_OPEN') ?? []

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 py-12 sm:py-20 px-6 text-center">
        {/* subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '48px 48px' }}
        />
        <div className="relative">
          {live.length > 0 && (
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/80 rounded-full px-4 py-1.5 text-sm mb-6">
              <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
              {live.length} tournament{live.length > 1 ? 's' : ''} live right now
            </div>
          )}
          <Trophy className="h-14 w-14 text-primary-400 mx-auto mb-4 drop-shadow-lg" />
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            Top<span className="text-primary-400">Seed</span>
          </h1>
          <p className="text-blue-200 text-lg max-w-xl mx-auto mb-8">
            Digitize local tournaments — real-time scores, bracket draws, and live leaderboards.
          </p>
          <Link
            to="/tournaments"
            className="inline-flex items-center gap-2 px-7 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-500 transition-colors shadow-lg shadow-primary-900/40"
          >
            Browse Tournaments <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Live Tournaments */}
      {live.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-red-500 fill-red-500" />
            Live Now
          </h2>
          <TournamentGrid tournaments={live} isLoading={false} />
        </section>
      )}

      {/* Open Registrations */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Open Registrations</h2>
          <Link to="/tournaments" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View all →
          </Link>
        </div>
        <TournamentGrid tournaments={upcoming} isLoading={isLoading} />
      </section>
    </div>
  )
}

function TournamentGrid({ tournaments, isLoading }: { tournaments: Tournament[]; isLoading: boolean }) {
  if (isLoading) return <LoadingSpinner className="py-12" />
  if (!tournaments.length) return (
    <div className="text-center py-12 text-gray-400 text-sm border border-dashed border-gray-200 rounded-2xl">
      No tournaments at the moment.
    </div>
  )

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tournaments.map(t => (
        <TournamentCard key={t.id} tournament={t} />
      ))}
    </div>
  )
}

function TournamentCard({ tournament: t }: { tournament: Tournament }) {
  return (
    <Link
      to={`/tournaments/${t.id}/organization`}
      className="group block bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* colored top strip */}
      <div className="h-1 w-full bg-gradient-to-r from-primary-500 to-blue-400" />
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <span className="text-3xl leading-none">{t.sport.icon ?? '🏆'}</span>
          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', STATUS_COLORS[t.status])}>
            {t.status.replace(/_/g, ' ')}
          </span>
        </div>
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-primary-700 transition-colors">
          {t.name}
        </h3>
        <p className="text-sm text-gray-500 mb-3">{t.sport.name}</p>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />{t._count?.events ?? 0} events
          </span>
          {t.startDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />{formatDate(t.startDate)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
