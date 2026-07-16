import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api/admin'
import { useAuthStore } from '../../store/authStore'
import { formatDate, cn } from '../../lib/utils'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { User } from '../../types'

const ROLES = ['USER', 'ADMIN', 'SUPER_ADMIN'] as const

const ROLE_TEXT: Record<string, string> = {
  USER:        'text-tok-muted',
  ADMIN:       'text-acc3',
  SUPER_ADMIN: 'text-acc1',
}

export default function AdminUsers() {
  const { user: me } = useAuthStore()
  const qc = useQueryClient()

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: adminApi.listUsers,
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.setUserRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  if (isLoading) return <LoadingSpinner className="py-16" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl text-tok tracking-tight">Manage Users</h1>
        <span className="mono-label text-tok-muted">{users?.length ?? 0} users</span>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-tok">
            <tr>
              {['User', 'Contact', 'Joined', 'Role'].map(h => (
                <th key={h} className="text-left px-4 py-3 mono-label text-tok-muted font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-tok">
            {users?.map((u: User & { createdAt?: string }) => (
              <tr key={u.id} className="hover:bg-tok-surface transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-tok">{u.displayName}</p>
                  <p className="font-mono text-[10px] text-tok-muted opacity-60">{u.id.slice(-8)}</p>
                </td>
                <td className="px-4 py-3 text-tok-muted">{u.email ?? u.phone ?? '—'}</td>
                <td className="px-4 py-3 mono-label text-tok-muted">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3">
                  {u.id === me?.id ? (
                    <span className={cn('glass rounded-full px-2.5 py-1 mono-label', ROLE_TEXT[u.role])}>
                      {u.role} (you)
                    </span>
                  ) : (
                    <select
                      value={u.role}
                      onChange={e => roleMutation.mutate({ id: u.id, role: e.target.value })}
                      disabled={roleMutation.isPending}
                      className="glass rounded-lg px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-tok focus:outline-none"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
