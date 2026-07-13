import api from '../lib/axios'
import { Match } from '../types'

export const matchApi = {
  get: (id: string) =>
    api.get<Match>(`/matches/${id}`).then(r => r.data),

  updateScore: (id: string, scores: Record<string, unknown>, winnerId?: string | null) =>
    api.patch<Match>(`/matches/${id}/score`, { scores, winnerId }).then(r => r.data),

  schedule: (id: string, scheduledAt: string) =>
    api.patch<Match>(`/matches/${id}/schedule`, { scheduledAt }).then(r => r.data),

  updateStatus: (id: string, status: string) =>
    api.patch<Match>(`/matches/${id}/status`, { status }).then(r => r.data),
}
