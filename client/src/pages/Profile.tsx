import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { User, Plus, Trash2, Users, Copy, Check } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { teamApi } from '../api/teams'
import { Team } from '../types'
import api from '../lib/axios'
import { cn } from '../lib/utils'

export default function Profile() {
  const { user, setUser } = useAuthStore()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [requestReason, setRequestReason] = useState('')
  const [requestSent, setRequestSent] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const updateMutation = useMutation({
    mutationFn: () => api.patch('/auth/me', { displayName }).then(r => r.data),
    onSuccess: (updated) => setUser(updated),
    onError: (e: Error) => setError(e.message),
  })

  const requestAdminMutation = useMutation({
    mutationFn: () => api.post('/auth/request-admin', { reason: requestReason }).then(r => r.data),
    onSuccess: () => setRequestSent(true),
    onError: (e: Error) => setError(e.message),
  })

  const copyId = () => {
    navigator.clipboard.writeText(user!.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!user) return null

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="font-display font-bold text-2xl text-tok tracking-tight">Profile</h1>

      {error && (
        <div className="glass rounded-xl px-4 py-3 text-sm text-red-500 border border-red-500/20">{error}</div>
      )}

      {/* Profile card */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-4 mb-2">
          {user.photoURL
            ? <img src={user.photoURL} alt="" className="h-16 w-16 rounded-full object-cover ring-2 border-tok" />
            : <div className="h-16 w-16 glass rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-tok-muted" />
              </div>
          }
          <div>
            <p className="mono-label text-acc1 capitalize">{user.role.toLowerCase().replace('_', ' ')}</p>
            <p className="text-sm text-tok-muted">{user.email ?? user.phone}</p>
          </div>
        </div>

        <div>
          <label className="block mono-label text-tok-muted mb-1.5">Display Name</label>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="w-full glass rounded-xl px-3 py-2 text-sm text-tok placeholder:text-tok-muted focus:outline-none focus:ring-2 ring-tok transition-shadow"
          />
        </div>

        <button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending || displayName === user.displayName}
          className="btn-primary"
        >
          {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
        </button>

        {/* User ID */}
        <div className="pt-3 border-t border-tok">
          <p className="mono-label text-tok-muted mb-1.5">
            Your TopSeed ID <span className="opacity-60">(share to be added to a team)</span>
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 glass rounded-xl px-3 py-2 font-mono text-xs text-tok truncate">
              {user.id}
            </code>
            <button onClick={copyId} className="p-2 glass rounded-xl hover:border-acc1/40 transition-colors">
              {copied
                ? <Check className="h-4 w-4 text-acc2" />
                : <Copy  className="h-4 w-4 text-tok-muted" />
              }
            </button>
          </div>
        </div>
      </div>

      {/* Team management */}
      <TeamSection />

      {/* Request Admin */}
      {user.role === 'USER' && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <p className="font-semibold text-tok">Request Admin Access</p>
          <p className="text-sm text-tok-muted">Want to host tournaments? Send a request to the super-admin.</p>
          {requestSent || user.adminRequest?.status === 'PENDING' ? (
            <div className="glass rounded-xl px-4 py-3 mono-label text-orange-500">Your request is pending review.</div>
          ) : user.adminRequest?.status === 'APPROVED' ? (
            <div className="glass rounded-xl px-4 py-3 mono-label text-acc2">Request approved.</div>
          ) : (
            <>
              <textarea
                value={requestReason}
                onChange={e => setRequestReason(e.target.value)}
                placeholder="Why do you want admin access? (optional)"
                rows={3}
                className="w-full glass rounded-xl px-3 py-2 text-sm text-tok placeholder:text-tok-muted focus:outline-none focus:ring-2 ring-tok transition-shadow"
              />
              <button
                onClick={() => requestAdminMutation.mutate()}
                disabled={requestAdminMutation.isPending}
                className="btn-primary"
              >
                {requestAdminMutation.isPending ? 'Sending…' : 'Send Request'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function TeamSection() {
  const qc = useQueryClient()
  const [newTeamName, setNewTeamName] = useState('')
  const [addEmail, setAddEmail]       = useState<Record<string, string>>({})
  const [addError, setAddError]       = useState<Record<string, string>>({})
  const [showCreate, setShowCreate]   = useState(false)

  const { data: teams, isLoading } = useQuery({
    queryKey: ['my-teams'],
    queryFn: teamApi.mine,
  })

  const createMutation = useMutation({
    mutationFn: () => teamApi.create(newTeamName.trim()),
    onSuccess: () => { setNewTeamName(''); setShowCreate(false); qc.invalidateQueries({ queryKey: ['my-teams'] }) },
  })

  const addPlayerMutation = useMutation({
    mutationFn: async ({ teamId, email }: { teamId: string; email: string }) => {
      const found = await teamApi.lookupByEmail(email)
      return teamApi.addPlayer(teamId, found.id)
    },
    onSuccess: (_, vars) => {
      setAddEmail(prev => ({ ...prev, [vars.teamId]: '' }))
      setAddError(prev => ({ ...prev, [vars.teamId]: '' }))
      qc.invalidateQueries({ queryKey: ['my-teams'] })
    },
    onError: (_, vars) => {
      setAddError(prev => ({ ...prev, [vars.teamId]: 'User not found with that email.' }))
    },
  })

  const removeMutation = useMutation({
    mutationFn: ({ teamId, playerId }: { teamId: string; playerId: string }) =>
      teamApi.removePlayer(teamId, playerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-teams'] }),
  })

  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-tok flex items-center gap-2">
          <Users className="h-4 w-4 text-tok-muted" /> My Teams
        </p>
        <button onClick={() => setShowCreate(p => !p)} className="btn-primary text-xs py-1.5 px-3">
          <Plus className="h-3.5 w-3.5" /> New Team
        </button>
      </div>

      {showCreate && (
        <div className="flex gap-2">
          <input
            value={newTeamName}
            onChange={e => setNewTeamName(e.target.value)}
            placeholder="Team name"
            className="flex-1 glass rounded-xl px-3 py-2 text-sm text-tok placeholder:text-tok-muted focus:outline-none focus:ring-2 ring-tok transition-shadow"
          />
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !newTeamName.trim()}
            className="btn-primary text-xs py-2 px-4"
          >
            {createMutation.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="mono-label text-tok-muted">Loading teams…</p>
      ) : !teams?.length ? (
        <p className="mono-label text-tok-muted">You haven't created any teams yet.</p>
      ) : (
        <div className="space-y-4">
          {teams.map((team: Team) => (
            <div key={team.id} className="glass rounded-xl p-4 space-y-3">
              <p className="font-semibold text-tok">{team.name}</p>
              <div className="space-y-1">
                {team.players.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-tok">{p.user.displayName}</span>
                    <button
                      onClick={() => removeMutation.mutate({ teamId: team.id, playerId: p.id })}
                      disabled={removeMutation.isPending}
                      className="p-1 rounded-full text-tok-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {!team.players.length && <p className="mono-label text-tok-muted">No players yet.</p>}
              </div>
              <div>
                <div className="flex gap-2">
                  <input
                    value={addEmail[team.id] ?? ''}
                    onChange={e => setAddEmail(prev => ({ ...prev, [team.id]: e.target.value }))}
                    placeholder="Player email"
                    type="email"
                    className={cn(
                      'flex-1 glass rounded-xl px-3 py-1.5 text-sm text-tok',
                      'placeholder:text-tok-muted focus:outline-none focus:ring-2 ring-tok transition-shadow'
                    )}
                  />
                  <button
                    onClick={() => addPlayerMutation.mutate({ teamId: team.id, email: addEmail[team.id] ?? '' })}
                    disabled={addPlayerMutation.isPending || !(addEmail[team.id] ?? '').trim()}
                    className="btn-ghost text-xs py-1.5 px-3"
                  >
                    Add
                  </button>
                </div>
                {addError[team.id] && <p className="mono-label text-red-500 mt-1">{addError[team.id]}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
