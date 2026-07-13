import { useState } from 'react'
import { TournamentEvent } from '../../types'

interface Props {
  initial?: Partial<TournamentEvent>
  sportName?: string
  onSubmit: (data: Partial<TournamentEvent>) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

type SportCategory = 'racket' | 'tennis' | 'volleyball' | 'timed' | 'other'

interface ScoringFields {
  gamesPerMatch?: number
  pointsPerGame?: number
  deuce?: boolean
  setsPerMatch?: number
  gamesPerSet?: number
  tiebreak?: boolean
  pointsPerSet?: number
  finalSetPoints?: number
  matchDuration?: number
  pointsWin?: number
  pointsDraw?: number
  pointsLoss?: number
}

function getSportCategory(sport?: string): SportCategory {
  if (!sport) return 'other'
  const s = sport.toLowerCase()
  if (['badminton', 'squash', 'table tennis', 'pickleball'].includes(s)) return 'racket'
  if (s === 'tennis') return 'tennis'
  if (s === 'volleyball') return 'volleyball'
  if (['football', 'basketball', 'hockey', 'handball', 'rugby', 'cricket', 'baseball', 'athletics', 'swimming'].includes(s)) return 'timed'
  return 'other'
}

function configToFields(config: unknown): ScoringFields {
  if (!config || typeof config !== 'object') return {}
  const c = config as Record<string, unknown>
  return {
    gamesPerMatch: c.gamesPerMatch as number | undefined,
    pointsPerGame: c.pointsPerGame as number | undefined,
    deuce: c.deuce as boolean | undefined,
    setsPerMatch: c.setsPerMatch as number | undefined,
    gamesPerSet: c.gamesPerSet as number | undefined,
    tiebreak: c.tiebreak as boolean | undefined,
    pointsPerSet: c.pointsPerSet as number | undefined,
    finalSetPoints: c.finalSetPoints as number | undefined,
    matchDuration: c.matchDuration as number | undefined,
    pointsWin: c.pointsWin as number | undefined,
    pointsDraw: c.pointsDraw as number | undefined,
    pointsLoss: c.pointsLoss as number | undefined,
  }
}

function fieldsToConfig(
  category: SportCategory,
  fields: ScoringFields,
  format: string,
): Record<string, unknown> | null {
  const cfg: Record<string, unknown> = {}

  if (category === 'racket') {
    cfg.gamesPerMatch = fields.gamesPerMatch ?? 3
    cfg.pointsPerGame = fields.pointsPerGame ?? 21
    cfg.deuce = fields.deuce ?? true
  } else if (category === 'tennis') {
    cfg.setsPerMatch = fields.setsPerMatch ?? 3
    cfg.gamesPerSet = fields.gamesPerSet ?? 6
    cfg.tiebreak = fields.tiebreak ?? true
  } else if (category === 'volleyball') {
    cfg.setsPerMatch = fields.setsPerMatch ?? 5
    cfg.pointsPerSet = fields.pointsPerSet ?? 25
    cfg.finalSetPoints = fields.finalSetPoints ?? 15
    cfg.deuce = fields.deuce ?? true
  } else if (category === 'timed') {
    if (fields.matchDuration) cfg.matchDuration = fields.matchDuration
  }

  if (format === 'ROUND_ROBIN') {
    cfg.pointsWin = fields.pointsWin ?? 3
    cfg.pointsDraw = fields.pointsDraw ?? 1
    cfg.pointsLoss = fields.pointsLoss ?? 0
  }

  return Object.keys(cfg).length > 0 ? cfg : null
}

const emptyForm: Partial<TournamentEvent> = {
  name: '',
  eventType: 'SINGLES',
  gender: 'OPEN',
  ageGroup: '',
  format: 'SINGLE_ELIMINATION',
  maxEntries: undefined,
  entryFee: undefined,
  scoringConfig: undefined,
}

export default function EventForm({ initial, sportName, onSubmit, onCancel, loading }: Props) {
  const category = getSportCategory(sportName)

  const [form, setForm] = useState<Partial<TournamentEvent>>({
    ...emptyForm,
    ...initial,
    entryFee: initial?.entryFee ? initial.entryFee / 100 : undefined,
  })
  const [fields, setFields] = useState<ScoringFields>(configToFields(initial?.scoringConfig))
  const [jsonFallback, setJsonFallback] = useState(
    category === 'other' && initial?.scoringConfig
      ? JSON.stringify(initial.scoringConfig, null, 2)
      : ''
  )
  const [error, setError] = useState('')

  const set = <K extends keyof TournamentEvent>(key: K, value: TournamentEvent[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  const sf = (key: keyof ScoringFields, value: ScoringFields[typeof key]) =>
    setFields(f => ({ ...f, [key]: value }))

  const handleSubmit = async () => {
    setError('')
    let scoringConfig: Record<string, unknown> | null = null
    if (category === 'other') {
      if (jsonFallback.trim()) {
        try { scoringConfig = JSON.parse(jsonFallback) }
        catch { setError('Scoring config must be valid JSON'); return }
      }
    } else {
      scoringConfig = fieldsToConfig(category, fields, form.format ?? 'SINGLE_ELIMINATION')
    }
    const entryFeePaise = form.entryFee && (form.entryFee as number) > 0
      ? Math.round((form.entryFee as number) * 100)
      : null
    await onSubmit({ ...form, entryFee: entryFeePaise, scoringConfig })
  }

  const isRR = form.format === 'ROUND_ROBIN'

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}

      <Field label="Event Name">
        <input
          value={form.name ?? ''}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g. Men's Singles, Mixed Doubles, Under 18 Girls"
          className={inputCls}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Type">
          <select value={form.eventType} onChange={e => set('eventType', e.target.value as TournamentEvent['eventType'])} className={inputCls}>
            <option value="SINGLES">Singles</option>
            <option value="DOUBLES">Doubles</option>
            <option value="TEAM">Team</option>
          </select>
        </Field>
        <Field label="Gender">
          <select value={form.gender} onChange={e => set('gender', e.target.value as TournamentEvent['gender'])} className={inputCls}>
            <option value="MEN">Men's</option>
            <option value="WOMEN">Women's</option>
            <option value="MIXED">Mixed</option>
            <option value="OPEN">Open</option>
          </select>
        </Field>
        <Field label="Age Group (optional)">
          <input
            value={form.ageGroup ?? ''}
            onChange={e => set('ageGroup', e.target.value || null as never)}
            placeholder="U12, U18, 35+, Open"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Format">
          <select value={form.format} onChange={e => set('format', e.target.value as TournamentEvent['format'])} className={inputCls}>
            <option value="SINGLE_ELIMINATION">Single Elimination</option>
            <option value="DOUBLE_ELIMINATION">Double Elimination</option>
            <option value="ROUND_ROBIN">Round Robin</option>
          </select>
        </Field>
        <Field label="Max Entries (optional)">
          <input
            type="number"
            value={form.maxEntries ?? ''}
            onChange={e => set('maxEntries', e.target.value ? Number(e.target.value) : undefined as never)}
            className={inputCls}
          />
        </Field>
        <Field label="Entry Fee ₹ (optional)">
          <input
            type="number"
            min="0"
            step="1"
            value={form.entryFee ?? ''}
            onChange={e => set('entryFee', e.target.value ? Number(e.target.value) : undefined as never)}
            placeholder="0 = free"
            className={inputCls}
          />
        </Field>
      </div>

      {/* Scoring Rules */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-gray-700">
          Scoring Rules
          {sportName && <span className="ml-2 text-xs font-normal text-gray-400">({sportName})</span>}
        </p>

        {category === 'racket' && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Games per Match">
              <select value={fields.gamesPerMatch ?? 3} onChange={e => sf('gamesPerMatch', Number(e.target.value))} className={inputCls}>
                <option value={1}>1</option>
                <option value={3}>3</option>
                <option value={5}>5</option>
              </select>
            </Field>
            <Field label="Points per Game">
              <input type="number" value={fields.pointsPerGame ?? 21} onChange={e => sf('pointsPerGame', Number(e.target.value))} className={inputCls} />
            </Field>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="deuce" checked={fields.deuce ?? true} onChange={e => sf('deuce', e.target.checked)} className="h-4 w-4 accent-primary-600" />
              <label htmlFor="deuce" className="text-sm text-gray-700 cursor-pointer">Deuce rule</label>
            </div>
          </div>
        )}

        {category === 'tennis' && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Sets per Match">
              <select value={fields.setsPerMatch ?? 3} onChange={e => sf('setsPerMatch', Number(e.target.value))} className={inputCls}>
                <option value={1}>1</option>
                <option value={3}>3</option>
                <option value={5}>5</option>
              </select>
            </Field>
            <Field label="Games per Set">
              <input type="number" value={fields.gamesPerSet ?? 6} onChange={e => sf('gamesPerSet', Number(e.target.value))} className={inputCls} />
            </Field>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="tiebreak" checked={fields.tiebreak ?? true} onChange={e => sf('tiebreak', e.target.checked)} className="h-4 w-4 accent-primary-600" />
              <label htmlFor="tiebreak" className="text-sm text-gray-700 cursor-pointer">Tiebreak</label>
            </div>
          </div>
        )}

        {category === 'volleyball' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Sets per Match">
              <select value={fields.setsPerMatch ?? 5} onChange={e => sf('setsPerMatch', Number(e.target.value))} className={inputCls}>
                <option value={3}>3</option>
                <option value={5}>5</option>
              </select>
            </Field>
            <Field label="Points per Set">
              <input type="number" value={fields.pointsPerSet ?? 25} onChange={e => sf('pointsPerSet', Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Final Set Points">
              <input type="number" value={fields.finalSetPoints ?? 15} onChange={e => sf('finalSetPoints', Number(e.target.value))} className={inputCls} />
            </Field>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="deuce" checked={fields.deuce ?? true} onChange={e => sf('deuce', e.target.checked)} className="h-4 w-4 accent-primary-600" />
              <label htmlFor="deuce" className="text-sm text-gray-700 cursor-pointer">Deuce rule</label>
            </div>
          </div>
        )}

        {category === 'timed' && (
          <Field label="Match Duration (mins)">
            <input
              type="number"
              value={fields.matchDuration ?? ''}
              onChange={e => sf('matchDuration', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="e.g. 90"
              className={`${inputCls} max-w-xs`}
            />
          </Field>
        )}

        {category === 'other' && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              Enter as JSON — e.g. <code className="bg-gray-100 px-1 rounded">{`{"matchDuration":90,"pointsWin":3}`}</code>
            </p>
            <textarea
              value={jsonFallback}
              onChange={e => setJsonFallback(e.target.value)}
              rows={3}
              className={`${inputCls} font-mono text-xs`}
            />
          </div>
        )}

        {/* Round Robin points — all non-other sports */}
        {isRR && category !== 'other' && (
          <div className="grid gap-3 sm:grid-cols-3 pt-3 mt-1 border-t border-gray-100">
            <Field label="Win Points">
              <input type="number" value={fields.pointsWin ?? 3} onChange={e => sf('pointsWin', Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Draw Points">
              <input type="number" value={fields.pointsDraw ?? 1} onChange={e => sf('pointsDraw', Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Loss Points">
              <input type="number" value={fields.pointsLoss ?? 0} onChange={e => sf('pointsLoss', Number(e.target.value))} className={inputCls} />
            </Field>
          </div>
        )}
        {isRR && category === 'other' && (
          <p className="text-xs text-gray-400 pt-1">Include <code>pointsWin</code>, <code>pointsDraw</code>, <code>pointsLoss</code> in the JSON for standings.</p>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSubmit}
          disabled={loading || !form.name}
          className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : initial?.id ? 'Update Event' : 'Add Event'}
        </button>
        <button onClick={onCancel} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
          Cancel
        </button>
      </div>
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
