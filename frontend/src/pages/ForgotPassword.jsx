import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Mail } from 'lucide-react'
import AuthShell from '../components/AuthShell'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'

const PASSWORD_RULES = [
  { test: (value) => value.length >= 8, label: 'At least 8 characters' },
  { test: (value) => /[A-Za-z]/.test(value), label: 'Contains a letter' },
  { test: (value) => /\d/.test(value), label: 'Contains a number' },
]

export default function ForgotPassword() {
  const toast = useToast()
  const navigate = useNavigate()

  // 'email' mails a reset code, 'reset' verifies it and stores the new password.
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [passwords, setPasswords] = useState({ next: '', confirm: '' })
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const passwordChecks = PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(passwords.next),
  }))

  async function requestCode(event) {
    event?.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    setSending(true)
    try {
      await api.forgotPassword(email.trim())
      setStep('reset')
      toast.success('If that email is registered, a reset code is on its way.')
    } catch (requestError) {
      const message = requestError.message || 'Unable to send the reset code.'
      setError(message)
      toast.error(message)
    } finally {
      setSending(false)
    }
  }

  async function handleReset(event) {
    event.preventDefault()
    setError('')

    if (!/^\d{4,8}$/.test(otp.trim())) {
      setError('Enter the numeric code we emailed you.')
      return
    }
    if (!passwordChecks.every((check) => check.passed)) {
      setError('Password does not meet the requirements below.')
      return
    }
    if (passwords.next !== passwords.confirm) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await api.resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        new_password: passwords.next,
      })
      toast.success('Password updated — please sign in.')
      navigate('/login', { replace: true })
    } catch (requestError) {
      const message = requestError.message || 'Unable to reset your password.'
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle={
        step === 'email'
          ? 'We’ll email a one-time code to confirm it’s you'
          : 'Enter the code and choose a new password'
      }
      footer={
        <p className="text-sm text-slate-500">
          Remembered it?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Back to sign in
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
        <form onSubmit={requestCode} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@company.com"
              className="input"
            />
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
              <Mail className="h-3 w-3" />
              We&apos;ll email you a one-time reset code.
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
            {sending ? 'Sending code…' : 'Send reset code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="space-y-4" noValidate>
          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="truncate text-xs text-slate-600">{email.trim()}</p>
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
              Reset code
            </label>
            <input
              id="otp"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
              autoComplete="one-time-code"
              placeholder="123456"
              className="input tracking-[0.4em]"
            />
            <div className="mt-1.5 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <KeyRound className="h-3 w-3" />
                Check your inbox (and spam).
              </p>
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
            <label htmlFor="next" className="label">
              New password
            </label>
            <input
              id="next"
              type="password"
              value={passwords.next}
              onChange={(event) =>
                setPasswords((current) => ({ ...current, next: event.target.value }))
              }
              autoComplete="new-password"
              placeholder="••••••••"
              className="input"
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
              Confirm new password
            </label>
            <input
              id="confirm"
              type="password"
              value={passwords.confirm}
              onChange={(event) =>
                setPasswords((current) => ({ ...current, confirm: event.target.value }))
              }
              autoComplete="new-password"
              placeholder="••••••••"
              className="input"
            />
            {passwords.confirm && passwords.confirm !== passwords.next ? (
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
            {submitting ? 'Updating password…' : 'Update password'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
