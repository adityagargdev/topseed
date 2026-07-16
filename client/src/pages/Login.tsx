import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
} from '../firebase'
import { useAuthStore } from '../store/authStore'
import api from '../lib/axios'
import { User } from '../types'
import WaveHero from '../components/hero/WaveHero'
import { cn } from '../lib/utils'

type Step = 'choose' | 'phone' | 'otp' | 'email'

export default function Login() {
  const [step, setStep] = useState<Step>('choose')
  const [isSignUp, setIsSignUp] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)

  const confirmationRef = useRef<{ confirm: (code: string) => Promise<unknown> } | null>(null)
  const recaptchaRef    = useRef<RecaptchaVerifier | null>(null)
  const { setUser }     = useAuthStore()
  const navigate        = useNavigate()

  const syncAfterFirebaseAuth = async () => {
    const { data } = await api.post<User>('/auth/sync')
    setUser(data)
  }

  const handleGoogle = async () => {
    setLoading(true); setError('')
    try {
      await signInWithPopup(auth, googleProvider)
      await syncAfterFirebaseAuth()
      navigate('/')
    } catch (e: unknown) {
      const code = (e as { code?: string }).code
      setError(
        code === 'auth/popup-blocked'
          ? 'Popup was blocked. Please allow popups and try again.'
          : (e as Error).message
      )
    } finally { setLoading(false) }
  }

  const handleEmailSubmit = async () => {
    setError('')
    if (isSignUp && password !== confirmPassword) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(cred.user, { displayName: name.trim() || email.split('@')[0] })
        await sendEmailVerification(cred.user)
        await signOut(auth)
        setVerificationSent(true)
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password)
        if (!cred.user.emailVerified) {
          await signOut(auth)
          setError('Please verify your email before signing in. Check your inbox.')
          return
        }
        await syncAfterFirebaseAuth()
        navigate('/')
      }
    } catch (e: unknown) {
      const code = (e as { code?: string }).code
      const messages: Record<string, string> = {
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/email-already-in-use': 'An account with this email already exists',
        'auth/invalid-email': 'Invalid email address',
        'auth/invalid-credential': 'Incorrect email or password',
      }
      setError(messages[code ?? ''] ?? (e as Error).message)
    } finally { setLoading(false) }
  }

  const handleSendOtp = async () => {
    setLoading(true); setError('')
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' })
      }
      const confirmation = await signInWithPhoneNumber(auth, phone, recaptchaRef.current)
      confirmationRef.current = confirmation
      setStep('otp')
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }

  const handleVerifyOtp = async () => {
    setLoading(true); setError('')
    try {
      await confirmationRef.current?.confirm(otp)
      await syncAfterFirebaseAuth()
      navigate('/')
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }

  const goBack = () => { setStep('choose'); setError('') }

  return (
    <div className="min-h-screen bg-tok-bg text-tok">
      <WaveHero minHeight="100vh">
        <div className="min-h-screen flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-sm">
            {/* Logo */}
            <div className="text-center mb-8">
              <h1 className="font-display font-extrabold text-3xl tracking-tight text-tok mb-1">
                Top<span className="gradient-text">Seed</span>
              </h1>
              <p className="mono-label text-tok-muted">Sign in to continue</p>
            </div>

            {/* Card */}
            <div className="glass rounded-2xl p-6 space-y-4">
              {error && (
                <div className="glass rounded-xl px-4 py-3 text-sm text-red-500 border border-red-500/20">
                  {error}
                </div>
              )}

              {step === 'choose' && (
                <div className="space-y-3">
                  <AuthBtn onClick={handleGoogle} disabled={loading}>
                    <img
                      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                      alt="" className="h-4 w-4"
                    />
                    Continue with Google
                  </AuthBtn>
                  <AuthBtn onClick={() => { setIsSignUp(false); setStep('email') }}>
                    Continue with Email
                  </AuthBtn>
                  <AuthBtn onClick={() => setStep('phone')}>
                    Continue with Phone
                  </AuthBtn>
                </div>
              )}

              {step === 'email' && verificationSent && (
                <div className="text-center space-y-4">
                  <div className="text-4xl">📬</div>
                  <p className="font-semibold text-tok">Check your inbox</p>
                  <p className="text-sm text-tok-muted">
                    We sent a verification link to{' '}
                    <span className="text-tok font-medium">{email}</span>.
                    Click it, then sign in.
                  </p>
                  <button
                    onClick={() => { setVerificationSent(false); setIsSignUp(false); setError('') }}
                    className="btn-primary w-full justify-center rounded-xl"
                  >
                    Go to Sign In
                  </button>
                </div>
              )}

              {step === 'email' && !verificationSent && (
                <div className="space-y-4">
                  {/* Sign in / Sign up toggle */}
                  <div className="glass rounded-full flex p-1">
                    {(['Sign In', 'Sign Up'] as const).map((label, i) => {
                      const active = i === 0 ? !isSignUp : isSignUp
                      return (
                        <button
                          key={label}
                          onClick={() => { setIsSignUp(i === 1); setError('') }}
                          className={cn(
                            'flex-1 py-1.5 text-sm font-medium rounded-full transition-colors',
                            active ? 'bg-acc1 text-white' : 'text-tok-muted hover:text-tok'
                          )}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>

                  {isSignUp && <Field label="Full Name" type="text" value={name} onChange={setName} placeholder="Your name" />}
                  <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
                  <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="Min 6 characters" />
                  {isSignUp && <Field label="Confirm Password" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repeat password" />}

                  <button
                    onClick={handleEmailSubmit}
                    disabled={loading || !email || !password || (isSignUp && !confirmPassword)}
                    className="btn-primary w-full justify-center rounded-xl"
                  >
                    {loading
                      ? (isSignUp ? 'Creating…' : 'Signing in…')
                      : (isSignUp ? 'Create Account' : 'Sign In')
                    }
                  </button>
                  <button onClick={goBack} className="w-full text-sm text-tok-muted hover:text-tok transition-colors">
                    ← Back
                  </button>
                </div>
              )}

              {step === 'phone' && (
                <div className="space-y-4">
                  <Field label="Phone Number" type="tel" value={phone} onChange={setPhone} placeholder="+91 9876543210">
                    <p className="text-xs text-tok-muted mt-1">Include country code, e.g. +91</p>
                  </Field>
                  <div id="recaptcha-container" />
                  <button
                    onClick={handleSendOtp}
                    disabled={loading || !phone}
                    className="btn-primary w-full justify-center rounded-xl"
                  >
                    {loading ? 'Sending…' : 'Send OTP'}
                  </button>
                  <button onClick={goBack} className="w-full text-sm text-tok-muted hover:text-tok transition-colors">
                    ← Back
                  </button>
                </div>
              )}

              {step === 'otp' && (
                <div className="space-y-4">
                  <Field label="OTP" type="text" value={otp} onChange={setOtp} placeholder="6-digit code" inputMode="numeric" maxLength={6}>
                    <p className="text-xs text-tok-muted mt-1">OTP sent to {phone}</p>
                  </Field>
                  <button
                    onClick={handleVerifyOtp}
                    disabled={loading || otp.length !== 6}
                    className="btn-primary w-full justify-center rounded-xl"
                  >
                    {loading ? 'Verifying…' : 'Verify OTP'}
                  </button>
                  <button onClick={() => setStep('phone')} className="w-full text-sm text-tok-muted hover:text-tok transition-colors">
                    Change number
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </WaveHero>
    </div>
  )
}

/* ── Helpers ── */

function AuthBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center justify-center gap-2.5 glass rounded-xl px-4 py-2.5',
        'text-sm font-medium text-tok hover:border-acc1 transition-colors disabled:opacity-50'
      )}
    >
      {children}
    </button>
  )
}

function Field({
  label, type, value, onChange, placeholder, inputMode, maxLength, children,
}: {
  label: string; type: string; value: string
  onChange: (v: string) => void; placeholder?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  maxLength?: number; children?: React.ReactNode
}) {
  return (
    <div>
      <label className="block mono-label text-tok-muted mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        className={cn(
          'w-full glass rounded-xl px-3 py-2.5 text-sm text-tok',
          'placeholder:text-tok-muted',
          'focus:outline-none focus:ring-2 ring-tok transition-shadow'
        )}
      />
      {children}
    </div>
  )
}
