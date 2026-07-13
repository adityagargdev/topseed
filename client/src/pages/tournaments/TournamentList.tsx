import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus } from 'lucide-react'
import { tournamentApi } from '../../api/tournaments'
import { sportApi } from '../../api/sports'
import { useAuthStore } from '../../store/authStore'
import { cn, formatDate, STATUS_COLORS } from '../../lib/utils'
import LoadingSpinner from '../../components/common/LoadingSpinner'

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tournaments</h1>
        {isAdmin && (
          <Link
            to="/tournaments/create"
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> New Tournament
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tournaments..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={sportFilter}
          onChange={e => setSportFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Sports</option>
          {sports?.map(s => <option key={s.id} value={s.name}>{s.icon} {s.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All Status'}</option>)}
        </select>
      </div>

      {/* List */}
      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : !tournaments?.length ? (
        <div className="text-center py-16 text-gray-500">No tournaments found.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map(t => (
            <Link
              key={t.id}
              to={`/tournaments/${t.id}/organization`}
              className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 block"
            >
              <div className="h-1 w-full bg-gradient-to-r from-primary-500 to-blue-400" />
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-3xl leading-none">{t.sport.icon ?? '🏆'}</span>
                  <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', STATUS_COLORS[t.status])}>
                    {t.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 line-clamp-1 mb-1 group-hover:text-primary-700 transition-colors">{t.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{t.sport.name}</p>
                {t.startDate && <p className="text-xs text-gray-400">{formatDate(t.startDate)} – {formatDate(t.endDate)}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
