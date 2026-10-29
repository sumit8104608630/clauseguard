import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import AuthShell from '../components/AuthShell'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const PASSWORD_RULES = [
  { test: (value) => value.length >= 8, label: 'At least 8 characters' },
  { test: (value) => /[A-Za-z]/.test(value), label: 'Contains a letter' },
  { test: (value) => /\d/.test(value), label: 'Contains a number' },
]

export default function Register() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const passwordChecks = PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(form.password),
  }))

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

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
      await api.register({
        email: form.email,
        password: form.password,
        full_name: form.full_name.trim(),
      })

      // Registration does not return cookies, so sign in straight away.
      await login(form.email, form.password)
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

  const inputClasses = 'input'

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start reviewing contracts in minutes"
      footer={
        <p className="text-sm text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <p className="text-xs text-rose-700">{error}</p>
          </div>
        ) : null}

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
    </AuthShell>
  )
}
