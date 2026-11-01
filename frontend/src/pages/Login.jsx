import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import AuthShell from '../components/AuthShell'
import GoogleSignInButton from '../components/GoogleSignInButton'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Login() {
  const { login, loginWithGoogle } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const redirectTo = location.state?.from || '/'

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function reportError(message) {
    setError(message)
    toast.error(message)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!form.email || !form.password) {
      setError('Email and password are required.')
      return
    }

    setSubmitting(true)
    try {
      await login(form.email, form.password)
      toast.success('Welcome back!')
      navigate(redirectTo, { replace: true })
    } catch (requestError) {
      reportError(requestError.message || 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleToken(accessToken) {
    setError('')
    await loginWithGoogle(accessToken)
    toast.success('Welcome back!')
    navigate(redirectTo, { replace: true })
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your contract dashboard"
      footer={
        <p className="text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700">
            Create one
          </Link>
        </p>
      }
    >
      <GoogleSignInButton
        onToken={handleGoogleToken}
        onError={(requestError) =>
          reportError(requestError?.message || 'Unable to sign in with Google.')
        }
      />

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

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <p className="text-xs text-rose-700">{error}</p>
          </div>
        ) : null}

        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            placeholder="you@company.com"
            className="input"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="label">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="mb-1.5 text-[11px] font-medium text-brand-600 hover:text-brand-700"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => update('password', event.target.value)}
              placeholder="••••••••"
              className="input pr-9"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary w-full"
        >
          {submitting ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : null}
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  )
}
