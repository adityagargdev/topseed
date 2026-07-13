import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api/admin'
import { useAuthStore } from '../../store/authStore'
import { formatDate } from '../../lib/utils'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { User } from '../../types'

const ROLES = ['USER', 'ADMIN', 'SUPER_ADMIN'] as const

const ROLE_COLORS: Record<string, string> = {
  USER: 'bg-gray-100 text-gray-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
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
        <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
        <span className="text-sm text-gray-500">{users?.length ?? 0} users</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users?.map((u: User & { createdAt?: string }) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{u.displayName}</p>
                  <p className="text-xs text-gray-400 font-mono">{u.id.slice(-8)}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.email ?? u.phone ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3">
                  {u.id === me?.id ? (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_COLORS[u.role]}`}>
                      {u.role} (you)
                    </span>
                  ) : (
                    <select
                      value={u.role}
                      onChange={e => roleMutation.mutate({ id: u.id, role: e.target.value })}
                      disabled={roleMutation.isPending}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>{r.replace('_', ' ')}</option>
                      ))}
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
