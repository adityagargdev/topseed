import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Users, FileText, Plus } from 'lucide-react'
import { adminApi } from '../../api/admin'
import { useAuthStore } from '../../store/authStore'
import { cn } from '../../lib/utils'

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const { data: requests } = useQuery({
    queryKey: ['admin', 'requests'],
    queryFn: adminApi.listRequests,
    enabled: user?.role === 'SUPER_ADMIN',
  })

  const pendingCount = requests?.filter(r => r.status === 'PENDING').length ?? 0

  const cards = [
    {
      to: '/tournaments/create',
      icon: <Plus className="h-6 w-6" />,
      title: 'New Tournament',
      subtitle: 'Create and manage a tournament',
      accent: 'text-acc1',
      always: true,
    },
    {
      to: '/admin/requests',
      icon: <FileText className="h-6 w-6" />,
      title: 'Admin Requests',
      subtitle: `${pendingCount} pending`,
      accent: 'text-orange-500',
      badge: pendingCount > 0 ? pendingCount : undefined,
      always: false,
    },
    {
      to: '/admin/users',
      icon: <Users className="h-6 w-6" />,
      title: 'Manage Users',
      subtitle: 'View and manage all users',
      accent: 'text-acc2',
      always: false,
    },
  ].filter(c => c.always || user?.role === 'SUPER_ADMIN')

  return (
    <div className="space-y-6">
      <h1 className="font-display font-bold text-2xl text-tok tracking-tight">Admin Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(card => (
          <Link
            key={card.to}
            to={card.to}
            className="glass rounded-2xl p-6 flex items-center gap-4 hover:border-acc1/40 transition-colors group"
          >
            <div className={cn('glass rounded-xl p-3 shrink-0 relative group-hover:bg-acc1/10 transition-colors', card.accent)}>
              {card.icon}
              {card.badge !== undefined && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-acc1 text-white mono-label flex items-center justify-center rounded-full">
                  {card.badge}
                </span>
              )}
            </div>
            <div>
              <p className="font-semibold text-tok group-hover:text-acc1 transition-colors">{card.title}</p>
              <p className="text-sm text-tok-muted">{card.subtitle}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
