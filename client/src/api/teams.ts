import api from '../lib/axios'
import { Team } from '../types'

export const teamApi = {
  mine: () => api.get<Team[]>('/teams/mine').then(r => r.data),
  create: (name: string) => api.post<Team>('/teams', { name }).then(r => r.data),
  get: (id: string) => api.get<Team>(`/teams/${id}`).then(r => r.data),
  update: (id: string, name: string) => api.patch<Team>(`/teams/${id}`, { name }).then(r => r.data),
  addPlayer: (teamId: string, userId: string) =>
    api.post(`/teams/${teamId}/players`, { userId }).then(r => r.data),
  removePlayer: (teamId: string, playerId: string) =>
    api.delete(`/teams/${teamId}/players/${playerId}`).then(r => r.data),
  lookupByEmail: (email: string) =>
    api.get<{ id: string; displayName: string; email: string }>(`/auth/lookup?email=${encodeURIComponent(email)}`).then(r => r.data),
}
