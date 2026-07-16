import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Trophy } from 'lucide-react'
import { tournamentApi } from '../../../api/tournaments'
import { useEventId } from '../../../hooks/useEventId'
import EventSelector from '../../../components/common/EventSelector'
import { getEntryName, cn } from '../../../lib/utils'
import LoadingSpinner from '../../../components/common/LoadingSpinner'
import { TournamentEntry, RRStanding } from '../../../types'

const MEDAL = ['🥇', '🥈', '🥉', '4️⃣']
const PLACE = ['1st Place', '2nd Place', '3rd Place', '4th Place']

export default function Winners() {
  const { id } = useParams<{ id: string }>()
  const { events, selectedEventId, setEventId } = useEventId()

  const { data, isLoading } = useQuery({
    queryKey: ['tournament', id, 'winners', selectedEventId],
    queryFn: () => tournamentApi.getWinners(id!, selectedEventId!),
    enabled: !!id && !!selectedEventId,
  })

  const { data: entries } = useQuery({
    queryKey: ['tournament', id, 'entries', selectedEventId],
    queryFn: () => tournamentApi.getEntries(id!, selectedEventId!),
    enabled: !!id && !!selectedEventId && (data as { format?: string } | null)?.format === 'ROUND_ROBIN',
  })

  return (
    <div>
      <EventSelector events={events} selectedId={selectedEventId} onChange={setEventId} />
      {!selectedEventId ? (
        <p className="mono-label text-tok-muted">No events found for this tournament.</p>
      ) : isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <WinnersContent data={data} entries={entries} />
      )}
    </div>
  )
}

function WinnersContent({ data, entries }: { data: unknown; entries?: TournamentEntry[] }) {
  type MatchResult = {
    winnerId: string | null; entry1Id: string | null; entry2Id: string | null
    winner: TournamentEntry | null; entry1: TournamentEntry | null; entry2: TournamentEntry | null
  }
  const d = data as {
    format: string; eventName?: string; standings?: RRStanding[]
    finalMatch?: MatchResult | null; thirdMatch?: MatchResult | null
    sfLosers?: (TournamentEntry | null)[]
  } | null

  if (!d) return null

  if (d.format === 'ROUND_ROBIN' && d.standings) {
    const entryMap = new Map((entries ?? []).map(e => [e.id, e]))
    return (
      <WinnersLayout eventName={d.eventName}>
        {d.standings.slice(0, 4).map((s, i) => {
          const entry = entryMap.get(s.entryId)
          const name  = entry ? getEntryName(entry) : `Entry …${s.entryId.slice(-6)}`
          return <PodiumCard key={s.entryId} position={i} name={name} detail={`${s.points} pts · ${s.wins}W ${s.draws}D ${s.losses}L`} />
        })}
      </WinnersLayout>
    )
  }

  if (!d.finalMatch?.winner) {
    return (
      <div className="text-center py-16">
        <Trophy className="h-12 w-12 text-tok-muted mx-auto mb-4 opacity-30" />
        <p className="mono-label text-tok-muted">This event has not concluded yet.</p>
      </div>
    )
  }

  const second = d.finalMatch.winnerId === d.finalMatch.entry1Id ? d.finalMatch.entry2 : d.finalMatch.entry1
  const third  = d.thirdMatch?.winner ?? d.sfLosers?.[0] ?? null
  const fourth = d.thirdMatch
    ? (d.thirdMatch.winnerId === d.thirdMatch.entry1Id ? d.thirdMatch.entry2 : d.thirdMatch.entry1)
    : (d.sfLosers?.[1] ?? null)

  const places = [d.finalMatch.winner, second, third, fourth].filter((_, i) => i < 2 || _ !== null)

  return (
    <WinnersLayout eventName={d.eventName}>
      {places.map((entry, i) => (
        <PodiumCard key={i} position={i} name={entry ? getEntryName(entry) : '—'} />
      ))}
    </WinnersLayout>
  )
}

function WinnersLayout({ children, eventName }: { children: React.ReactNode; eventName?: string }) {
  return (
    <div className="max-w-md mx-auto space-y-3 py-8">
      <div className="text-center mb-8">
        <Trophy className="h-12 w-12 text-acc1 mx-auto mb-2" />
        <h2 className="font-display font-bold text-2xl text-tok">Results</h2>
        {eventName && <p className="mono-label text-tok-muted mt-1">{eventName}</p>}
      </div>
      {children}
    </div>
  )
}

function PodiumCard({ position, name, detail }: { position: number; name: string; detail?: string }) {
  const borderAcc = position === 0 ? 'border-yellow-400/60'
    : position === 1 ? 'border-tok'
    : position === 2 ? 'border-orange-400/60'
    : 'border-tok'

  return (
    <div className={cn('glass rounded-2xl flex items-center gap-4 p-5 border', borderAcc)}>
      <span className="text-4xl">{MEDAL[position]}</span>
      <div>
        <p className="mono-label text-tok-muted">{PLACE[position]}</p>
        <p className="text-lg font-bold text-tok">{name}</p>
        {detail && <p className="mono-label text-tok-muted mt-0.5">{detail}</p>}
      </div>
    </div>
  )
}
