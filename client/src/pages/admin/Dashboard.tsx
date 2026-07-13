import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Users, FileText, Plus } from 'lucide-react'
import { adminApi } from '../../api/admin'
import { useAuthStore } from '../../store/authStore'

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const { data: requests } = useQuery({
    queryKey: ['admin', 'requests'],
    queryFn: adminApi.listRequests,
    enabled: user?.role === 'SUPER_ADMIN',
  })

  const pendingCount = requests?.filter(r => r.status === 'PENDING').length ?? 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/tournaments/create"
          className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow flex items-center gap-4"
        >
          <div className="h-12 w-12 bg-primary-100 rounded-xl flex items-center justify-center">
            <Plus className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">New Tournament</p>
            <p className="text-sm text-gray-500">Create and manage a tournament</p>
          </div>
        </Link>

        {user?.role === 'SUPER_ADMIN' && (
          <>
            <Link
              to="/admin/requests"
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow flex items-center gap-4"
            >
              <div className="h-12 w-12 bg-yellow-100 rounded-xl flex items-center justify-center relative">
                <FileText className="h-6 w-6 text-yellow-600" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900">Admin Requests</p>
                <p className="text-sm text-gray-500">{pendingCount} pending</p>
              </div>
            </Link>

            <Link
              to="/admin/users"
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow flex items-center gap-4"
            >
              <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Manage Users</p>
                <p className="text-sm text-gray-500">View and manage all users</p>
              </div>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
