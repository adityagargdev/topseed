import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { User, Plus, Trash2, Users, Copy, Check } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { teamApi } from '../api/teams'
import { Team } from '../types'
import api from '../lib/axios'

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
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {/* Profile card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-4 mb-2">
          {user.photoURL
            ? <img src={user.photoURL} alt="" className="h-16 w-16 rounded-full object-cover" />
            : <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center"><User className="h-8 w-8 text-gray-400" /></div>
          }
          <div>
            <p className="text-xs text-gray-500 capitalize">{user.role.toLowerCase().replace('_', ' ')}</p>
            <p className="text-sm text-gray-600">{user.email ?? user.phone}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending || displayName === user.displayName}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>

        {/* User ID — needed to be added to teams */}
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Your TopSeed User ID <span className="text-gray-400">(share this to be added to a team)</span></p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono text-gray-700 truncate">{user.id}</code>
            <button onClick={copyId} className="p-2 hover:bg-gray-100 rounded-lg shrink-0" title="Copy">
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-gray-500" />}
            </button>
          </div>
        </div>
      </div>

      {/* Team management */}
      <TeamSection />

      {/* Request Admin Access */}
      {user.role === 'USER' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Request Admin Access</h2>
          <p className="text-sm text-gray-500">Want to host tournaments? Send a request to the super-admin.</p>
          {requestSent || user.adminRequest?.status === 'PENDING' ? (
            <div className="bg-yellow-50 text-yellow-700 px-4 py-3 rounded-lg text-sm">Your request is pending review.</div>
          ) : user.adminRequest?.status === 'APPROVED' ? (
            <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">Request approved.</div>
          ) : (
            <>
              <textarea
                value={requestReason}
                onChange={e => setRequestReason(e.target.value)}
                placeholder="Why do you want admin access? (optional)"
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={() => requestAdminMutation.mutate()}
                disabled={requestAdminMutation.isPending}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-50"
              >
                {requestAdminMutation.isPending ? 'Sending...' : 'Send Request'}
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
  const [addEmail, setAddEmail] = useState<Record<string, string>>({})
  const [addError, setAddError] = useState<Record<string, string>>({})
  const [showCreate, setShowCreate] = useState(false)

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
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Users className="h-5 w-5 text-gray-500" /> My Teams
        </h2>
        <button
          onClick={() => setShowCreate(p => !p)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" /> New Team
        </button>
      </div>

      {showCreate && (
        <div className="flex gap-2">
          <input
            value={newTeamName}
            onChange={e => setNewTeamName(e.target.value)}
            placeholder="Team name"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !newTeamName.trim()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading teams…</p>
      ) : !teams?.length ? (
        <p className="text-sm text-gray-500">You haven't created any teams yet.</p>
      ) : (
        <div className="space-y-4">
          {teams.map((team: Team) => (
            <div key={team.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
              <p className="font-semibold text-gray-900">{team.name}</p>

              {/* Players */}
              <div className="space-y-1">
                {team.players.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800">{p.user.displayName}</span>
                    <button
                      onClick={() => removeMutation.mutate({ teamId: team.id, playerId: p.id })}
                      disabled={removeMutation.isPending}
                      className="p-1 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600"
                      title="Remove player"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {!team.players.length && <p className="text-xs text-gray-400">No players yet.</p>}
              </div>

              {/* Add player by email */}
              <div>
                <div className="flex gap-2">
                  <input
                    value={addEmail[team.id] ?? ''}
                    onChange={e => setAddEmail(prev => ({ ...prev, [team.id]: e.target.value }))}
                    placeholder="Player email"
                    type="email"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={() => addPlayerMutation.mutate({ teamId: team.id, email: addEmail[team.id] ?? '' })}
                    disabled={addPlayerMutation.isPending || !(addEmail[team.id] ?? '').trim()}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
                {addError[team.id] && <p className="text-xs text-red-600 mt-1">{addError[team.id]}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
