import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { adminApi } from '../../api/admin'
import { formatDate } from '../../lib/utils'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function AdminRequests() {
  const qc = useQueryClient()
  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin', 'requests'],
    queryFn: adminApi.listRequests,
  })

  const approveMutation = useMutation({
    mutationFn: adminApi.approveRequest,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'requests'] }),
  })
  const rejectMutation = useMutation({
    mutationFn: adminApi.rejectRequest,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'requests'] }),
  })

  if (isLoading) return <LoadingSpinner className="py-16" />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Requests</h1>

      {!requests?.length ? (
        <p className="text-gray-500">No requests yet.</p>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900">{req.user.displayName}</p>
                <p className="text-sm text-gray-500">{req.user.email ?? req.user.phone}</p>
                {req.reason && <p className="text-sm text-gray-700 mt-1 italic">"{req.reason}"</p>}
                <p className="text-xs text-gray-400 mt-1">{formatDate(req.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {req.status === 'PENDING' ? (
                  <>
                    <button
                      onClick={() => approveMutation.mutate(req.id)}
                      disabled={approveMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" /> Approve
                    </button>
                    <button
                      onClick={() => rejectMutation.mutate(req.id)}
                      disabled={rejectMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" /> Reject
                    </button>
                  </>
                ) : (
                  <span className={`text-sm font-medium px-3 py-1.5 rounded-lg ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {req.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
