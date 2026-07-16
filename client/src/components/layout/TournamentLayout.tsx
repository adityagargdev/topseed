import { useState } from 'react'
import { NavLink, Outlet, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Bell, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import { notificationApi } from '../../api/notifications'

const TABS = [
  { label: 'Organization', path: 'organization' },
  { label: 'Seedings',     path: 'seedings' },
  { label: 'Draws',        path: 'draws' },
  { label: 'Matches',      path: 'matches' },
  { label: 'Players',      path: 'players' },
  { label: 'Winners',      path: 'winners' },
]

export default function TournamentLayout() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const [showNotifPanel, setShowNotifPanel] = useState(false)

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center border-b border-tok">
          <nav className="flex items-center gap-1 overflow-x-auto flex-1">
            {TABS.map(tab => (
              <NavLink
                key={tab.path}
                to={`/tournaments/${id}/${tab.path}`}
                className={({ isActive }) =>
                  cn(
                    'mono-label whitespace-nowrap border-b-2 -mb-px px-3 py-2.5 transition-colors',
                    isActive
                      ? 'border-acc1 text-acc1'
                      : 'border-transparent text-tok-muted hover:text-tok hover:border-tok'
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
                'shrink-0 p-2 rounded-full border border-transparent transition-colors ml-1',
                showNotifPanel
                  ? 'bg-tok-surface border-tok text-acc1'
                  : 'text-tok-muted hover:text-tok hover:bg-tok-surface'
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
    <div className="mb-6 glass rounded-2xl p-4 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="mono-label text-tok font-semibold">Notification Preferences</p>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-tok-surface transition-colors">
          <X className="h-4 w-4 text-tok-muted" />
        </button>
      </div>
      <div className="space-y-3">
        {([
          { key: 'scoreUpdates', label: 'Score updates' },
          { key: 'matchStart',   label: 'Match start alerts' },
          { key: 'statusChange', label: 'Tournament status changes' },
        ] as const).map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-sm text-tok">{label}</span>
            <button
              role="switch"
              aria-checked={settings[key]}
              onClick={() => toggle(key)}
              disabled={mutation.isPending}
              className={cn(
                'relative w-10 h-6 rounded-full transition-colors focus:outline-none',
                settings[key] ? 'bg-acc1' : 'bg-tok-surface border border-tok'
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
