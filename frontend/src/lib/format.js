/** Small formatting helpers shared across the dashboard. */

export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return '—'
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )
  const value = bytes / 1024 ** exponent

  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

export function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelative(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`

  return date.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
}

export function initials(name, email) {
  const source = (name || email || '?').trim()
  const parts = source.split(/[\s@._-]+/).filter(Boolean)

  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return (parts[0][0] + parts[1][0]).toUpperCase()
}

/** Tailwind classes + label for each contract lifecycle status. */
export const STATUS_META = {
  uploaded: {
    label: 'Uploaded',
    className: 'bg-slate-100 text-slate-700 ring-slate-200',
    dot: 'bg-slate-400',
  },
  processing: {
    label: 'Processing',
    className: 'bg-amber-50 text-amber-700 ring-amber-200',
    dot: 'bg-amber-500',
  },
  processed: {
    label: 'Processed',
    className: 'bg-blue-50 text-blue-700 ring-blue-200',
    dot: 'bg-blue-500',
  },
  analyzing: {
    label: 'Analyzing',
    className: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    dot: 'bg-indigo-500',
  },
  analyzed: {
    label: 'Analyzed',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dot: 'bg-emerald-500',
  },
  failed: {
    label: 'Failed',
    className: 'bg-rose-50 text-rose-700 ring-rose-200',
    dot: 'bg-rose-500',
  },
}

export function statusMeta(status) {
  return STATUS_META[status] ?? STATUS_META.uploaded
}

/** Tailwind classes + label for each risk severity. */
export const RISK_META = {
  high: { label: 'High', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
  medium: {
    label: 'Medium',
    className: 'bg-amber-50 text-amber-700 ring-amber-200',
  },
  low: { label: 'Low', className: 'bg-sky-50 text-sky-700 ring-sky-200' },
  none: {
    label: 'No risk',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
}

export function riskMeta(level) {
  return RISK_META[level] ?? RISK_META.none
}

export function fileExtension(filename) {
  if (!filename) return 'FILE'
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop().toUpperCase() : 'FILE'
}

export function isPdf(filename) {
  return (filename || '').toLowerCase().endsWith('.pdf')
}
