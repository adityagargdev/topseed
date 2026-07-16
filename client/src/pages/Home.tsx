import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Trophy, Users, MapPin, ChevronRight } from 'lucide-react'
import { tournamentApi } from '../api/tournaments'
import { Tournament } from '../types'
import { cn } from '../lib/utils'
import LoadingSpinner from '../components/common/LoadingSpinner'
import TournamentCard from '../components/tournaments/TournamentCard'
import WaveHero from '../components/hero/WaveHero'

const FALLBACK_TICKER =
  'TopSeed  ·  Badminton Open 2025  ·  Football League Round 3  ·  ' +
  'Tennis Finals  ·  Cricket T20 Championship  ·  Volleyball Semifinal  ·  ' +
  'Table Tennis Cup  ·  Squash Quarterfinal  ·  Swimming Nationals'

export default function Home() {
  const { data: tournaments, isLoading } = useQuery({
    queryKey: ['tournaments', 'recent'],
    queryFn: () => tournamentApi.list(),
  })

  const live     = tournaments?.filter(t => t.status === 'IN_PROGRESS')      ?? []
  const upcoming = tournaments?.filter(t => t.status === 'REGISTRATION_OPEN') ?? []

  const tickerContent =
    live.length > 0
      ? `LIVE NOW  ·  ${live.map(t => t.name.toUpperCase()).join('  ·  ')}  ·  `
      : FALLBACK_TICKER

  return (
    <>
      {/* ── Hero (waves + blobs + grain + ticker) ── */}
      <WaveHero
        tickerContent={tickerContent}
        minHeight="560px"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 lg:pt-20 lg:pb-28">

          {/* Live badge */}
          {live.length > 0 && (
            <div className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6">
              <span className="h-2 w-2 rounded-full bg-acc1 animate-pulse-slow" />
              <span className="mono-label text-acc1">
                {live.length} live now
              </span>
            </div>
          )}

          {/* Two-tone headline */}
          <h1
            className="font-display font-extrabold text-tok tracking-tight leading-[1.05] mb-5"
            style={{ fontSize: 'clamp(40px, 6vw, 68px)' }}
          >
            Run every<br />
            <span className="gradient-text">tournament</span><br />
            like a broadcast.
          </h1>

          {/* Sub-text */}
          <p className="text-tok-muted text-base max-w-sm leading-relaxed mb-8">
            Real-time scores, bracket draws, and live leaderboards — built for local
            tournaments, designed for spectators.
          </p>

          {/* Stat pills */}
          <div className="flex flex-wrap gap-2.5 mb-10">
            {([
              { icon: <Trophy className="h-3.5 w-3.5" />, value: '120+',   label: 'Tournaments' },
              { icon: <Users  className="h-3.5 w-3.5" />, value: '8,500+', label: 'Players' },
              { icon: <MapPin className="h-3.5 w-3.5" />, value: '42',     label: 'Cities' },
            ] as const).map(chip => (
              <div
                key={chip.label}
                className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-2"
              >
                <span className="text-acc1">{chip.icon}</span>
                <span className="font-bold text-tok text-sm">{chip.value}</span>
                <span className="mono-label text-tok-muted">{chip.label}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link to="/tournaments" className="btn-primary">
            Browse Tournaments <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </WaveHero>

      {/* ── Tournament sections ── */}
      <div className="mt-10 space-y-10">
        {live.length > 0 && (
          <section>
            <SectionHeading label="Live Now" dot="bg-acc1" pulse />
            <TournamentGrid tournaments={live} isLoading={false} />
          </section>
        )}

        <section>
          <SectionHeading label="Open Registrations" linkTo="/tournaments" linkLabel="View all" />
          <TournamentGrid tournaments={upcoming} isLoading={isLoading} />
        </section>
      </div>
    </>
  )
}

/* ── Helpers ── */

function SectionHeading({
  label, dot, pulse, linkTo, linkLabel,
}: {
  label: string; dot?: string; pulse?: boolean
  linkTo?: string; linkLabel?: string
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="flex items-center gap-2">
        {dot && (
          <span className={cn('h-2 w-2 rounded-full shrink-0', dot, pulse && 'animate-pulse-slow')} />
        )}
        <span className="mono-label text-tok font-semibold">{label}</span>
      </h2>
      {linkTo && (
        <Link to={linkTo} className="mono-label text-acc1 hover:opacity-75 transition-opacity">
          {linkLabel} →
        </Link>
      )}
    </div>
  )
}

function TournamentGrid({ tournaments, isLoading }: { tournaments: Tournament[]; isLoading: boolean }) {
  if (isLoading) return <LoadingSpinner className="py-12" />
  if (!tournaments.length) {
    return (
      <div className="py-12 border border-dashed border-tok rounded-2xl text-center">
        <p className="mono-label text-tok-muted">No tournaments at the moment</p>
      </div>
    )
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tournaments.map(t => <TournamentCard key={t.id} tournament={t} />)}
    </div>
  )
}
