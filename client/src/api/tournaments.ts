import api from '../lib/axios'
import { Tournament, TournamentEvent, TournamentEntry, Match } from '../types'

export const tournamentApi = {
  list: (params?: Record<string, string>) =>
    api.get<Tournament[]>('/tournaments', { params }).then(r => r.data),

  get: (id: string) =>
    api.get<Tournament>(`/tournaments/${id}`).then(r => r.data),

  verifyAccess: (id: string, password?: string) =>
    api.post<{ access: boolean }>(`/tournaments/${id}/access`, { password }).then(r => r.data),

  create: (data: Record<string, unknown>) =>
    api.post<Tournament>('/tournaments', data).then(r => r.data),

  update: (id: string, data: Partial<Tournament>) =>
    api.patch<Tournament>(`/tournaments/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/tournaments/${id}`).then(r => r.data),

  updateStatus: (id: string, status: string) =>
    api.patch<Tournament>(`/tournaments/${id}/status`, { status }).then(r => r.data),

  // ── Events ────────────────────────────────────────────────────────────────
  listEvents: (tournamentId: string) =>
    api.get<TournamentEvent[]>(`/tournaments/${tournamentId}/events`).then(r => r.data),

  createEvent: (tournamentId: string, data: Partial<TournamentEvent>) =>
    api.post<TournamentEvent>(`/tournaments/${tournamentId}/events`, data).then(r => r.data),

  updateEvent: (tournamentId: string, eventId: string, data: Partial<TournamentEvent>) =>
    api.patch<TournamentEvent>(`/tournaments/${tournamentId}/events/${eventId}`, data).then(r => r.data),

  deleteEvent: (tournamentId: string, eventId: string) =>
    api.delete(`/tournaments/${tournamentId}/events/${eventId}`).then(r => r.data),

  updateEventStatus: (tournamentId: string, eventId: string, status: string) =>
    api.patch<TournamentEvent>(`/tournaments/${tournamentId}/events/${eventId}/status`, { status }).then(r => r.data),

  // ── Per-event data (all require eventId) ──────────────────────────────────
  getEntries: (tournamentId: string, eventId: string) =>
    api.get<TournamentEntry[]>(`/tournaments/${tournamentId}/entries`, { params: { eventId } }).then(r => r.data),

  getSeedings: (tournamentId: string, eventId: string) =>
    api.get<TournamentEntry[]>(`/tournaments/${tournamentId}/seedings`, { params: { eventId } }).then(r => r.data),

  updateSeedings: (tournamentId: string, seedings: Array<{ entryId: string; seed: number | null }>) =>
    api.patch(`/tournaments/${tournamentId}/seedings`, seedings).then(r => r.data),

  getMatches: (tournamentId: string, eventId?: string, date?: string) =>
    api.get<Match[]>(`/tournaments/${tournamentId}/matches`, {
      params: { ...(eventId && { eventId }), ...(date && { date }) },
    }).then(r => r.data),

  getWinners: (tournamentId: string, eventId: string) =>
    api.get(`/tournaments/${tournamentId}/winners`, { params: { eventId } }).then(r => r.data),

  addGuestEntry: (tournamentId: string, eventId: string, name: string, partnerName?: string) =>
    api.post<TournamentEntry>(`/tournaments/${tournamentId}/entries`, { eventId, name, partnerName }).then(r => r.data),

  removeEntry: (tournamentId: string, entryId: string) =>
    api.delete(`/tournaments/${tournamentId}/entries/${entryId}`).then(r => r.data),

  register: (tournamentId: string, eventId: string, teamId?: string, partnerId?: string) =>
    api.post<TournamentEntry>(`/tournaments/${tournamentId}/register`, { eventId, teamId, partnerId }).then(r => r.data),

  withdraw: (tournamentId: string, eventId: string) =>
    api.delete(`/tournaments/${tournamentId}/register`, { data: { eventId } }).then(r => r.data),

  generateFixtures: (tournamentId: string, eventId: string, mode: 'auto' | 'manual', matches?: unknown[]) =>
    api.post<Match[]>(`/tournaments/${tournamentId}/generate-fixtures`, { eventId, mode, matches }).then(r => r.data),
}
