import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy } from 'lucide-react'
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

type Step = 'choose' | 'phone' | 'otp' | 'email'

export default function Login() {
  const [step, setStep] = useState<Step>('choose')
  const [isSignUp, setIsSignUp] = useState(false)

  // Email fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Phone fields
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)


  const confirmationRef = useRef<{ confirm: (code: string) => Promise<unknown> } | null>(null)
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)
  const { setUser } = useAuthStore()
  const navigate = useNavigate()

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
          ? 'Popup was blocked. Please allow popups for this site and try again.'
          : (e as Error).message
      )
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSubmit = async () => {
    setError('')
    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
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
          setError('Please verify your email before signing in. Check your inbox for the verification link.')
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
    } finally {
      setLoading(false)
    }
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
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    setLoading(true); setError('')
    try {
      await confirmationRef.current?.confirm(otp)
      await syncAfterFirebaseAuth()
      navigate('/')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const goBack = () => { setStep('choose'); setError('') }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-8">
          <Trophy className="h-10 w-10 text-primary-600 mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">TopSeed</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to continue</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
        )}

        {step === 'choose' && (
          <div className="space-y-3">
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="h-5 w-5" />
              Continue with Google
            </button>
            <button
              onClick={() => { setIsSignUp(false); setStep('email') }}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Continue with Email
            </button>
            <button
              onClick={() => setStep('phone')}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Continue with Phone Number
            </button>
          </div>
        )}

        {step === 'email' && verificationSent && (
          <div className="text-center space-y-4">
            <div className="text-4xl">📬</div>
            <p className="font-semibold text-gray-900">Check your inbox</p>
            <p className="text-sm text-gray-500">
              We sent a verification link to <span className="font-medium text-gray-700">{email}</span>.
              Click it to activate your account, then sign in.
            </p>
            <button
              onClick={() => { setVerificationSent(false); setIsSignUp(false); setError('') }}
              className="w-full bg-primary-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-primary-700"
            >
              Go to Sign In
            </button>
          </div>
        )}

        {step === 'email' && !verificationSent && (
          <div className="space-y-4">
            <div className="flex rounded-lg border border-gray-200 p-1 mb-2">
              <button
                onClick={() => { setIsSignUp(false); setError('') }}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${!isSignUp ? 'bg-primary-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setIsSignUp(true); setError('') }}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${isSignUp ? 'bg-primary-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Sign Up
              </button>
            </div>

            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}

            <button
              onClick={handleEmailSubmit}
              disabled={loading || !email || !password || (isSignUp && !confirmPassword)}
              className="w-full bg-primary-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
            <button onClick={goBack} className="w-full text-sm text-gray-500 hover:text-gray-700">
              Back
            </button>
          </div>
        )}

        {step === 'phone' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">Include country code, e.g. +91</p>
            </div>
            <div id="recaptcha-container" />
            <button
              onClick={handleSendOtp}
              disabled={loading || !phone}
              className="w-full bg-primary-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
            <button onClick={goBack} className="w-full text-sm text-gray-500 hover:text-gray-700">
              Back
            </button>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OTP</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="6-digit code"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 tracking-widest text-center"
              />
              <p className="text-xs text-gray-500 mt-1">OTP sent to {phone}</p>
            </div>
            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full bg-primary-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <button onClick={() => setStep('phone')} className="w-full text-sm text-gray-500 hover:text-gray-700">
              Change number
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
