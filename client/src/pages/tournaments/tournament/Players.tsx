import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { tournamentApi } from '../../../api/tournaments'
import { paymentApi } from '../../../api/payments'
import { useEventId } from '../../../hooks/useEventId'
import EventSelector from '../../../components/common/EventSelector'
import { TournamentEntry, TournamentEvent } from '../../../types'
import { getEntryName, cn } from '../../../lib/utils'
import { useAuthStore } from '../../../store/authStore'
import LoadingSpinner from '../../../components/common/LoadingSpinner'

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (document.getElementById('razorpay-script')) return resolve(true)
    const script = document.createElement('script')
    script.id = 'razorpay-script'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export default function Players() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const { events, selectedEventId, setEventId } = useEventId()
  const [activeLetter, setActiveLetter] = useState<string | null>(null)

  const selectedEvent = events.find(e => e.id === selectedEventId)

  const { data: entries, isLoading } = useQuery({
    queryKey: ['tournament', id, 'entries', selectedEventId],
    queryFn: () => tournamentApi.getEntries(id!, selectedEventId!),
    enabled: !!id && !!selectedEventId,
  })

  const isRegistered = !!user && (entries ?? []).some(
    e => e.player?.user?.email === user.email || e.player?.user?.displayName === user.displayName
  )

  const sorted = [...(entries ?? [])].sort((a, b) => getEntryName(a).localeCompare(getEntryName(b)))
  const grouped: Record<string, TournamentEntry[]> = {}
  for (const entry of sorted) {
    const letter = getEntryName(entry)[0]?.toUpperCase() ?? '#'
    if (!grouped[letter]) grouped[letter] = []
    grouped[letter].push(entry)
  }

  const availableLetters = new Set(Object.keys(grouped))
  const display = activeLetter
    ? (grouped[activeLetter] ? { [activeLetter]: grouped[activeLetter] } : {})
    : grouped

  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError]     = useState('')

  const registerMutation = useMutation({
    mutationFn: (partnerId?: string) =>
      tournamentApi.register(id!, selectedEventId!, undefined, partnerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tournament', id, 'entries', selectedEventId] }),
  })

  const handlePaidRegister = async (partnerId?: string) => {
    if (!selectedEventId) return
    setPaymentError(''); setPaymentLoading(true)
    try {
      const loaded = await loadRazorpayScript()
      if (!loaded) { setPaymentError('Failed to load payment gateway.'); return }
      const order = await paymentApi.createOrder(selectedEventId, partnerId)
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID as string,
        amount: order.amount, currency: order.currency, order_id: order.orderId,
        name: 'TopSeed', description: 'Tournament Registration',
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await paymentApi.verify({ ...response, eventId: selectedEventId, partnerId })
            qc.invalidateQueries({ queryKey: ['tournament', id, 'entries', selectedEventId] })
          } catch { setPaymentError('Payment succeeded but registration failed. Contact the organizer.') }
        },
        modal: { ondismiss: () => setPaymentLoading(false) },
        theme: { color: '#ec4899' },
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay(options)
      rzp.on('payment.failed', () => { setPaymentError('Payment failed. Please try again.'); setPaymentLoading(false) })
      rzp.open()
    } catch (err: unknown) {
      setPaymentError(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setPaymentLoading(false) }
  }

  const withdrawMutation = useMutation({
    mutationFn: () => tournamentApi.withdraw(id!, selectedEventId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tournament', id, 'entries', selectedEventId] }),
  })

  return (
    <div className="space-y-6">
      <EventSelector events={events} selectedId={selectedEventId} onChange={setEventId} />

      {selectedEvent?.status === 'REGISTRATION_OPEN' && user && (
        <RegistrationPanel
          event={selectedEvent}
          isRegistered={isRegistered}
          onRegister={(partnerId) =>
            selectedEvent.entryFee && selectedEvent.entryFee > 0
              ? handlePaidRegister(partnerId)
              : registerMutation.mutate(partnerId)
          }
          onWithdraw={() => withdrawMutation.mutate()}
          loading={registerMutation.isPending || withdrawMutation.isPending || paymentLoading}
          error={registerMutation.error?.message ?? withdrawMutation.error?.message ?? paymentError}
        />
      )}

      {!selectedEventId ? (
        <p className="mono-label text-tok-muted">No events found for this tournament.</p>
      ) : isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : !entries?.length ? (
        <div className="text-center py-16">
          <p className="mono-label text-tok-muted">No entries registered for this event yet.</p>
        </div>
      ) : (
        <>
          {/* Alphabet filter */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setActiveLetter(null)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                activeLetter === null ? 'bg-acc1 text-white' : 'glass text-tok-muted hover:text-tok'
              )}
            >
              All
            </button>
            {ALPHABET.map(letter => (
              <button
                key={letter}
                onClick={() => setActiveLetter(prev => prev === letter ? null : letter)}
                disabled={!availableLetters.has(letter)}
                className={cn(
                  'w-9 h-9 rounded-full text-sm font-medium transition-colors',
                  activeLetter === letter
                    ? 'bg-acc1 text-white'
                    : availableLetters.has(letter)
                      ? 'glass text-tok hover:border-acc1/40'
                      : 'text-tok-muted opacity-30 cursor-not-allowed'
                )}
              >
                {letter}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {Object.entries(display)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([letter, letterEntries]) => (
                <div key={letter}>
                  <h3 className="mono-label text-acc1 border-b border-tok pb-2 mb-3">{letter}</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {letterEntries.map(entry => <EntryCard key={entry.id} entry={entry} />)}
                  </div>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  )
}

function RegistrationPanel({
  event, isRegistered, onRegister, onWithdraw, loading, error,
}: {
  event: Pick<TournamentEvent, 'eventType' | 'entryFee'>
  isRegistered: boolean
  onRegister: (partnerId?: string) => void
  onWithdraw: () => void
  loading: boolean; error?: string
}) {
  const [partnerId, setPartnerId] = useState('')
  const isPaid      = event.entryFee && event.entryFee > 0
  const feeDisplay  = isPaid ? `₹${(event.entryFee! / 100).toFixed(0)}` : 'Free'

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-tok">Registration</p>
        <span className={cn(
          'glass rounded-full px-2.5 py-1 mono-label',
          isPaid ? 'text-orange-500' : 'text-acc2'
        )}>
          {feeDisplay}
        </span>
      </div>

      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

      {isRegistered ? (
        <div className="flex items-center justify-between">
          <span className="glass rounded-full px-3 py-1.5 mono-label text-acc2">
            ✓ You are registered
          </span>
          <button
            onClick={onWithdraw} disabled={loading}
            className="text-sm text-red-500 hover:opacity-75 underline disabled:opacity-50"
          >
            {loading ? 'Withdrawing…' : 'Withdraw'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {event.eventType === 'DOUBLES' && (
            <div>
              <label className="block mono-label text-tok-muted mb-1.5">Partner Player ID</label>
              <input
                value={partnerId}
                onChange={e => setPartnerId(e.target.value)}
                placeholder="Your partner's player ID"
                className="w-full glass rounded-xl px-3 py-2 text-sm text-tok placeholder:text-tok-muted focus:outline-none focus:ring-2 ring-tok transition-shadow"
              />
            </div>
          )}
          {event.eventType === 'TEAM' ? (
            <p className="text-sm text-tok-muted">
              Team registration is done by the team captain from their Profile page.
            </p>
          ) : (
            <button
              onClick={() => onRegister(event.eventType === 'DOUBLES' ? partnerId : undefined)}
              disabled={loading || (event.eventType === 'DOUBLES' && !partnerId.trim())}
              className="btn-primary"
            >
              {loading ? 'Processing…' : isPaid ? `Pay ${feeDisplay} & Register` : 'Register'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function EntryCard({ entry }: { entry: TournamentEntry }) {
  return (
    <div className="glass rounded-xl p-4">
      <p className="font-semibold text-tok">{getEntryName(entry)}</p>
      {entry.partner && <p className="mono-label text-tok-muted mt-1">Partner: {entry.partner.user.displayName}</p>}
      {entry.team && (
        <div className="mt-2 space-y-1">
          <p className="mono-label text-tok-muted">Captain: {entry.team.captain.displayName}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {entry.team.players.map(p => (
              <span key={p.id} className="glass rounded-full px-2 py-0.5 mono-label text-tok-muted">
                {p.user.displayName}
              </span>
            ))}
          </div>
        </div>
      )}
      {entry.seed && (
        <span className="mt-2 inline-flex items-center glass rounded-full px-2 py-0.5 mono-label text-acc1">
          Seed #{entry.seed}
        </span>
      )}
    </div>
  )
}
