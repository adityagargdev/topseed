import api from '../lib/axios'
import { AdminRequest, User } from '../types'

export const adminApi = {
  listRequests: () => api.get<(AdminRequest & { user: User })[]>('/admin/requests').then(r => r.data),
  approveRequest: (id: string) => api.patch(`/admin/requests/${id}/approve`).then(r => r.data),
  rejectRequest: (id: string) => api.patch(`/admin/requests/${id}/reject`).then(r => r.data),
  listUsers: () => api.get<User[]>('/admin/users').then(r => r.data),
  setUserRole: (id: string, role: string) => api.patch(`/admin/users/${id}/role`, { role }).then(r => r.data),
}
