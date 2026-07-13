import api from '../lib/axios'
import { Notification, NotificationSettings } from '../types'

export const notificationApi = {
  list: () => api.get<Notification[]>('/notifications').then(r => r.data),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`).then(r => r.data),
  markAllRead: () => api.patch('/notifications/read-all').then(r => r.data),
  getSettings: (tournamentId: string) =>
    api.get<NotificationSettings>(`/notifications/settings/${tournamentId}`).then(r => r.data),
  updateSettings: (tournamentId: string, settings: NotificationSettings) =>
    api.put<NotificationSettings>(`/notifications/settings/${tournamentId}`, settings).then(r => r.data),
}
