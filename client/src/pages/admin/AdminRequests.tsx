import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { adminApi } from '../../api/admin'
import { formatDate, cn } from '../../lib/utils'
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
      <h1 className="font-display font-bold text-2xl text-tok tracking-tight">Admin Requests</h1>

      {!requests?.length ? (
        <p className="mono-label text-tok-muted">No requests yet.</p>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className="glass rounded-2xl p-5 flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-tok">{req.user.displayName}</p>
                <p className="text-sm text-tok-muted">{req.user.email ?? req.user.phone}</p>
                {req.reason && (
                  <p className="text-sm text-tok mt-1 italic opacity-70">"{req.reason}"</p>
                )}
                <p className="mono-label text-tok-muted mt-1">{formatDate(req.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {req.status === 'PENDING' ? (
                  <>
                    <button
                      onClick={() => approveMutation.mutate(req.id)}
                      disabled={approveMutation.isPending}
                      className={cn(
                        'inline-flex items-center gap-1 px-3 py-1.5 rounded-full',
                        'bg-acc2 text-white mono-label hover:opacity-90 disabled:opacity-50'
                      )}
                    >
                      <Check className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => rejectMutation.mutate(req.id)}
                      disabled={rejectMutation.isPending}
                      className={cn(
                        'inline-flex items-center gap-1 px-3 py-1.5 rounded-full',
                        'bg-red-500 text-white mono-label hover:opacity-90 disabled:opacity-50'
                      )}
                    >
                      <X className="h-3.5 w-3.5" /> Reject
                    </button>
                  </>
                ) : (
                  <span className={cn(
                    'glass rounded-full px-3 py-1.5 mono-label',
                    req.status === 'APPROVED' ? 'text-acc2' : 'text-red-500'
                  )}>
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
