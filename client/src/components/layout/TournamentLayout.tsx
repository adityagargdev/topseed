import { useState } from 'react'
import { NavLink, Outlet, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Bell, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import { notificationApi } from '../../api/notifications'

const TABS = [
  { label: 'Organization', path: 'organization' },
  { label: 'Seedings', path: 'seedings' },
  { label: 'Draws', path: 'draws' },
  { label: 'Matches', path: 'matches' },
  { label: 'Players', path: 'players' },
  { label: 'Winners', path: 'winners' },
]

export default function TournamentLayout() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const [showNotifPanel, setShowNotifPanel] = useState(false)

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center border-b border-gray-200">
          <nav className="flex items-center gap-1 overflow-x-auto flex-1">
            {TABS.map(tab => (
              <NavLink
                key={tab.path}
                to={`/tournaments/${id}/${tab.path}`}
                className={({ isActive }) =>
                  cn(
                    'px-3 sm:px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors',
                    isActive
                      ? 'border-primary-600 text-primary-700'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                  )
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>

          {user && (
            <button
              onClick={() => setShowNotifPanel(p => !p)}
              className={cn(
                'shrink-0 p-2 rounded-lg border border-transparent transition-colors ml-1',
                showNotifPanel ? 'bg-primary-50 border-primary-200 text-primary-600' : 'text-gray-500 hover:bg-gray-100'
              )}
              title="Notification preferences"
            >
              <Bell className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {showNotifPanel && user && id && (
        <NotificationPanel tournamentId={id} onClose={() => setShowNotifPanel(false)} />
      )}

      <Outlet />
    </div>
  )
}

function NotificationPanel({ tournamentId, onClose }: { tournamentId: string; onClose: () => void }) {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['notif-settings', tournamentId],
    queryFn: () => notificationApi.getSettings(tournamentId),
  })

  const mutation = useMutation({
    mutationFn: (updated: { scoreUpdates: boolean; matchStart: boolean; statusChange: boolean }) =>
      notificationApi.updateSettings(tournamentId, updated),
  })

  if (isLoading || !settings) return null

  const toggle = (key: keyof typeof settings) => {
    const updated = { ...settings, [key]: !settings[key] }
    mutation.mutate(updated)
  }

  return (
    <div className="mb-6 p-4 bg-white border border-gray-200 rounded-xl shadow-sm max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-800">Notification Preferences</p>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>
      <div className="space-y-3">
        {([
          { key: 'scoreUpdates', label: 'Score updates' },
          { key: 'matchStart', label: 'Match starts (Live alerts)' },
          { key: 'statusChange', label: 'Tournament status changes' },
        ] as const).map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-sm text-gray-700">{label}</span>
            <button
              role="switch"
              aria-checked={settings[key]}
              onClick={() => toggle(key)}
              disabled={mutation.isPending}
              className={cn(
                'relative w-10 h-6 rounded-full transition-colors focus:outline-none',
                settings[key] ? 'bg-primary-600' : 'bg-gray-300'
              )}
            >
              <span className={cn(
                'absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                settings[key] ? 'translate-x-4' : 'translate-x-0'
              )} />
            </button>
          </label>
        ))}
      </div>
    </div>
  )
}
