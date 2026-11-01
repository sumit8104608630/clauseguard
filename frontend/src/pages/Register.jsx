import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, CheckCircle2, Mail } from 'lucide-react'
import AuthShell from '../components/AuthShell'
import GoogleSignInButton from '../components/GoogleSignInButton'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const PASSWORD_RULES = [
  { test: (value) => value.length >= 8, label: 'At least 8 characters' },
  { test: (value) => /[A-Za-z]/.test(value), label: 'Contains a letter' },
  { test: (value) => /\d/.test(value), label: 'Contains a number' },
]

export default function Register() {
  const { register, loginWithGoogle } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  // Step 1 collects the address and mails the code; step 2 collects the code
  // and the account details that are only persisted once the code checks out.
  const [step, setStep] = useState('email')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm: '',
  })
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const passwordChecks = PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(form.password),
  }))

  async function requestCode(event) {
    event?.preventDefault()
    setError('')

    if (!form.email.trim()) {
      setError('Please enter your email address.')
      return
    }

    setSending(true)
    try {
      await api.sendRegistrationOtp(form.email.trim())
      setStep('verify')
      toast.success(`Verification code sent to ${form.email.trim()}`)
    } catch (requestError) {
      const message = requestError.message || 'Unable to send the verification code.'
      setError(message)
      toast.error(message)
    } finally {
      setSending(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!/^\d{4,8}$/.test(otp.trim())) {
      setError('Enter the numeric code we emailed you.')
      return
    }
    if (!form.full_name.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (!passwordChecks.every((check) => check.passed)) {
      setError('Password does not meet the requirements below.')
      return
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await register({
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        otp: otp.trim(),
      })

      // The OTP already proved ownership of the inbox, so the backend signs
      // the new account in right away.
      toast.success('Account created — welcome to ClauseGuard!')
      navigate('/', { replace: true })
    } catch (requestError) {
      const message = requestError.message || 'Unable to create your account.'
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleToken(accessToken) {
    setError('')
    try {
      await loginWithGoogle(accessToken)
      toast.success('Welcome to ClauseGuard!')
      navigate('/', { replace: true })
    } catch (requestError) {
      const message = requestError.message || 'Unable to continue with Google.'
      setError(message)
      toast.error(message)
    }
  }

  const inputClasses = 'input'

  return (
    <AuthShell
      title="Create your account"
      subtitle="Verify your email, then start reviewing contracts"
      footer={
        <p className="text-sm text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </p>
      }
    >
      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      ) : null}

      {step === 'email' ? (
        <>
          <GoogleSignInButton onToken={handleGoogleToken} onError={(e) => setError(e?.message || 'Google sign-in failed.')} />

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-2 text-[11px] tracking-wider text-slate-400 uppercase">
                or
              </span>
            </div>
          </div>

          <form onSubmit={requestCode} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => update('email', event.target.value)}
                autoComplete="email"
                placeholder="you@company.com"
                className={inputClasses}
              />
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                <Mail className="h-3 w-3" />
                We&apos;ll email you a one-time verification code.
              </p>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="btn btn-primary w-full"
            >
              {sending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : null}
              {sending ? 'Sending code…' : 'Send verification code'}
            </button>
          </form>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="truncate text-xs text-slate-600">{form.email.trim()}</p>
            <button
              type="button"
              onClick={() => {
                setStep('email')
                setOtp('')
                setError('')
              }}
              className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-700"
            >
              <ArrowLeft className="h-3 w-3" />
              Change
            </button>
          </div>

          <div>
            <label htmlFor="otp" className="label">
              Verification code
            </label>
            <input
              id="otp"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
              autoComplete="one-time-code"
              placeholder="123456"
              className={`${inputClasses} tracking-[0.4em]`}
            />
            <div className="mt-1.5 flex items-center justify-between">
              <p className="text-[11px] text-slate-400">Check your inbox (and spam).</p>
              <button
                type="button"
                onClick={requestCode}
                disabled={sending}
                className="text-[11px] font-medium text-brand-600 hover:text-brand-700 disabled:opacity-60"
              >
                {sending ? 'Resending…' : 'Resend code'}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="full_name" className="label">
              Full name
            </label>
            <input
              id="full_name"
              value={form.full_name}
              onChange={(event) => update('full_name', event.target.value)}
              autoComplete="name"
              placeholder="Jane Doe"
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(event) => update('password', event.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
              className={inputClasses}
            />

            <ul className="mt-2 space-y-1">
              {passwordChecks.map((check) => (
                <li
                  key={check.label}
                  className={`flex items-center gap-1.5 text-[11px] ${
                    check.passed ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {check.label}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label htmlFor="confirm" className="label">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              value={form.confirm}
              onChange={(event) => update('confirm', event.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
              className={inputClasses}
            />
            {form.confirm && form.confirm !== form.password ? (
              <p className="mt-1.5 text-[11px] text-rose-600">
                Passwords do not match.
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary w-full"
          >
            {submitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : null}
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
