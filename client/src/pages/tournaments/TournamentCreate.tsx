import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { tournamentApi } from '../../api/tournaments'
import { sportApi } from '../../api/sports'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function TournamentCreate() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const { data: sports } = useQuery({ queryKey: ['sports'], queryFn: sportApi.list })

  const [form, setForm] = useState({
    name: '', description: '', sportId: '',
    isPublic: true, password: '',
    organizerName: '', address: '', venue: '',
    locationUrl: '', prizeMoney: '',
    startDate: '', endDate: '', registrationDeadline: '',
  })

  const mutation = useMutation({
    mutationFn: () => tournamentApi.create({
      ...form,
      password: !form.isPublic && form.password ? form.password : undefined,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      registrationDeadline: form.registrationDeadline ? new Date(form.registrationDeadline).toISOString() : undefined,
    }),
    onSuccess: (t) => navigate(`/tournaments/${t.id}/organization`),
    onError: (e: Error) => setError(e.message),
  })

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm(f => ({ ...f, [key]: value }))

  if (!sports) return <LoadingSpinner className="py-16" />

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Tournament</h1>
        <p className="text-sm text-gray-500 mt-1">
          After creating, go to the <strong>Organization</strong> tab to add events (e.g. Men's Singles, Mixed Doubles, Under-18).
        </p>
      </div>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Basic Info</h2>
        <Field label="Name *">
          <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Description">
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className={inputCls} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sport *">
            <select value={form.sportId} onChange={e => set('sportId', e.target.value)} className={inputCls}>
              <option value="">Select sport</option>
              {sports.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
            </select>
          </Field>
          <Field label="Visibility">
            <select value={form.isPublic ? 'true' : 'false'} onChange={e => set('isPublic', e.target.value === 'true')} className={inputCls}>
              <option value="true">Public</option>
              <option value="false">Private (password)</option>
            </select>
          </Field>
        </div>
        {!form.isPublic && (
          <Field label="Password">
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)} className={inputCls} />
          </Field>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Organization Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Organizer Name"><input value={form.organizerName} onChange={e => set('organizerName', e.target.value)} className={inputCls} /></Field>
          <Field label="Venue"><input value={form.venue} onChange={e => set('venue', e.target.value)} className={inputCls} /></Field>
          <Field label="Address"><input value={form.address} onChange={e => set('address', e.target.value)} className={inputCls} /></Field>
          <Field label="Prize Money"><input value={form.prizeMoney} onChange={e => set('prizeMoney', e.target.value)} placeholder="e.g. ₹50,000" className={inputCls} /></Field>
          <Field label="Location URL"><input value={form.locationUrl} onChange={e => set('locationUrl', e.target.value)} className={inputCls} /></Field>
          <Field label="Start Date"><input type="datetime-local" value={form.startDate} onChange={e => set('startDate', e.target.value)} className={inputCls} /></Field>
          <Field label="End Date"><input type="datetime-local" value={form.endDate} onChange={e => set('endDate', e.target.value)} className={inputCls} /></Field>
          <Field label="Registration Deadline"><input type="datetime-local" value={form.registrationDeadline} onChange={e => set('registrationDeadline', e.target.value)} className={inputCls} /></Field>
        </div>
      </div>

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !form.name || !form.sportId}
        className="w-full bg-primary-600 text-white rounded-xl px-6 py-3 font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
      >
        {mutation.isPending ? 'Creating...' : 'Create Tournament'}
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
