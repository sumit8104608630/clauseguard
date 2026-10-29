import { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

/**
 * Custom confirmation dialog, replacing native `confirm()`.
 * Rendered inline where it is used; the parent owns the `open` state.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'brand',
  busy = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onCancel?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, busy, onCancel])

  if (!open) return null

  const confirmClasses = tone === 'danger' ? 'btn-danger' : 'btn-primary'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="animate-fade-in absolute inset-0 bg-slate-900/40"
        onClick={() => !busy && onCancel?.()}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-lg bg-white p-4 shadow-xl sm:p-5"
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              tone === 'danger'
                ? 'bg-rose-50 text-rose-600'
                : 'bg-brand-50 text-brand-600'
            }`}
          >
            <AlertTriangle className="h-4.5 w-4.5" />
          </span>

          <div className="flex-1">
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => !busy && onCancel?.()}
            aria-label="Close"
            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn btn-outline btn-sm"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`btn btn-sm ${confirmClasses}`}
          >
            {busy ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
