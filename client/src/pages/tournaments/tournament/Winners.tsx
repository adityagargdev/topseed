import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Trophy } from 'lucide-react'
import { tournamentApi } from '../../../api/tournaments'
import { useEventId } from '../../../hooks/useEventId'
import EventSelector from '../../../components/common/EventSelector'
import { getEntryName } from '../../../lib/utils'
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

  // Fetch entries so RR standings can show names instead of IDs
  const { data: entries } = useQuery({
    queryKey: ['tournament', id, 'entries', selectedEventId],
    queryFn: () => tournamentApi.getEntries(id!, selectedEventId!),
    enabled: !!id && !!selectedEventId && (data as { format?: string } | null)?.format === 'ROUND_ROBIN',
  })

  return (
    <div>
      <EventSelector events={events} selectedId={selectedEventId} onChange={setEventId} />

      {!selectedEventId ? (
        <p className="text-gray-500 text-sm">No events found for this tournament.</p>
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
    winnerId: string | null
    entry1Id: string | null
    entry2Id: string | null
    winner: TournamentEntry | null
    entry1: TournamentEntry | null
    entry2: TournamentEntry | null
  }
  const d = data as {
    format: string
    eventName?: string
    standings?: RRStanding[]
    finalMatch?: MatchResult | null
    thirdMatch?: MatchResult | null
    sfLosers?: (TournamentEntry | null)[]
  } | null

  if (!d) return null

  if (d.format === 'ROUND_ROBIN' && d.standings) {
    const entryMap = new Map((entries ?? []).map(e => [e.id, e]))
    const top4 = d.standings.slice(0, 4)
    return (
      <WinnersLayout eventName={d.eventName}>
        {top4.map((s, i) => {
          const entry = entryMap.get(s.entryId)
          const name = entry ? getEntryName(entry) : `Entry …${s.entryId.slice(-6)}`
          return <PodiumCard key={s.entryId} position={i} name={name} detail={`${s.points} pts · ${s.wins}W ${s.draws}D ${s.losses}L`} />
        })}
      </WinnersLayout>
    )
  }

  if (!d.finalMatch?.winner) {
    return (
      <div className="text-center py-16">
        <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">This event has not concluded yet.</p>
      </div>
    )
  }

  const second = d.finalMatch.winnerId === d.finalMatch.entry1Id ? d.finalMatch.entry2 : d.finalMatch.entry1
  const third = d.thirdMatch?.winner ?? d.sfLosers?.[0] ?? null
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
    <div className="max-w-md mx-auto space-y-4 py-8">
      <div className="text-center mb-8">
        <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
        <h2 className="text-2xl font-bold text-gray-900">Results</h2>
        {eventName && <p className="text-gray-500 mt-1">{eventName}</p>}
      </div>
      {children}
    </div>
  )
}

function PodiumCard({ position, name, detail }: { position: number; name: string; detail?: string }) {
  return (
    <div className={`flex items-center gap-4 p-5 rounded-2xl border-2 ${
      position === 0 ? 'border-yellow-400 bg-yellow-50'
      : position === 1 ? 'border-gray-300 bg-gray-50'
      : position === 2 ? 'border-amber-600 bg-amber-50'
      : 'border-gray-200 bg-white'
    }`}>
      <span className="text-4xl">{MEDAL[position]}</span>
      <div>
        <p className="text-xs font-medium text-gray-500">{PLACE[position]}</p>
        <p className="text-lg font-bold text-gray-900">{name}</p>
        {detail && <p className="text-xs text-gray-500 mt-0.5">{detail}</p>}
      </div>
    </div>
  )
}
