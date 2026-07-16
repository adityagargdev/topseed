import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus } from 'lucide-react'
import { tournamentApi } from '../../api/tournaments'
import { sportApi } from '../../api/sports'
import { useAuthStore } from '../../store/authStore'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import TournamentCard from '../../components/tournaments/TournamentCard'

const STATUSES = ['', 'REGISTRATION_OPEN', 'IN_PROGRESS', 'COMPLETED']

export default function TournamentList() {
  const [search, setSearch] = useState('')
  const [sportFilter, setSportFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { user } = useAuthStore()

  const { data: sports } = useQuery({ queryKey: ['sports'], queryFn: sportApi.list })
  const { data: tournaments, isLoading } = useQuery({
    queryKey: ['tournaments', search, sportFilter, statusFilter],
    queryFn: () => {
      const params: Record<string, string> = {}
      if (search) params.search = search
      if (sportFilter) params.sport = sportFilter
      if (statusFilter) params.status = statusFilter
      return tournamentApi.list(params)
    },
  })

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl text-tok tracking-tight">Tournaments</h1>
        {isAdmin && (
          <Link to="/tournaments/create" className="btn-primary text-sm py-2 px-4">
            <Plus className="h-4 w-4" /> New Tournament
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-44">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-tok-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tournaments…"
            className="w-full glass rounded-xl pl-9 pr-3 py-2 text-sm text-tok placeholder:text-tok-muted focus:outline-none focus:ring-2 ring-tok transition-shadow"
          />
        </div>
        <select
          value={sportFilter}
          onChange={e => setSportFilter(e.target.value)}
          className="glass rounded-xl px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-tok focus:outline-none focus:ring-2 ring-tok transition-shadow"
        >
          <option value="">All Sports</option>
          {sports?.map(s => <option key={s.id} value={s.name}>{s.icon} {s.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="glass rounded-xl px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-tok focus:outline-none focus:ring-2 ring-tok transition-shadow"
        >
          {STATUSES.map(s => (
            <option key={s} value={s}>{s ? s.replace(/_/g, ' ') : 'All Status'}</option>
          ))}
        </select>
      </div>

      {/* Results */}
      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : !tournaments?.length ? (
        <div className="py-16 border border-dashed border-tok rounded-2xl text-center">
          <p className="mono-label text-tok-muted">No tournaments found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map(t => <TournamentCard key={t.id} tournament={t} />)}
        </div>
      )}
    </div>
  )
}
