import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'

/**
 * Custom toast notifications, replacing native `alert()`.
 * Usage: const toast = useToast(); toast.success('Saved')
 */

const ToastContext = createContext(null)

const VARIANTS = {
  success: {
    icon: CheckCircle2,
    accent: 'text-emerald-600',
    bar: 'bg-emerald-500',
  },
  error: { icon: XCircle, accent: 'text-rose-600', bar: 'bg-rose-500' },
  warning: {
    icon: AlertTriangle,
    accent: 'text-amber-600',
    bar: 'bg-amber-500',
  },
  info: { icon: Info, accent: 'text-brand-600', bar: 'bg-brand-500' },
}

let nextId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (message, variant = 'info', duration = 4200) => {
      if (!message) return

      const id = (nextId += 1)
      setToasts((current) => [...current, { id, message, variant }])

      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        )
      }
      return id
    },
    [dismiss],
  )

  const toast = useMemo(
    () => ({
      success: (message, duration) => push(message, 'success', duration),
      error: (message, duration) => push(message, 'error', duration),
      warning: (message, duration) => push(message, 'warning', duration),
      info: (message, duration) => push(message, 'info', duration),
      dismiss,
    }),
    [push, dismiss],
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}

      <div className="pointer-events-none fixed inset-x-3 top-3 z-[60] flex flex-col gap-2 sm:inset-x-auto sm:top-4 sm:right-4 sm:w-full sm:max-w-sm">
        {toasts.map((item) => {
          const variant = VARIANTS[item.variant] ?? VARIANTS.info
          const Icon = variant.icon

          return (
            <div
              key={item.id}
              role="status"
              className="animate-toast-in pointer-events-auto flex overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-slate-200"
            >
              <span className={`w-1 shrink-0 ${variant.bar}`} />

              <div className="flex flex-1 items-start gap-3 px-3 py-2.5">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${variant.accent}`} />
                <p className="flex-1 text-sm leading-snug text-slate-700">
                  {item.message}
                </p>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  aria-label="Dismiss notification"
                  className="rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used inside a <ToastProvider>')
  }
  return context
}
