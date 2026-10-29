import { statusMeta } from '../lib/format'

export default function StatusBadge({ status }) {
  const meta = statusMeta(status)

  return (
    <span className={`chip ${meta.className}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${meta.dot} ${
          status === 'processing' || status === 'analyzing'
            ? 'animate-pulse'
            : ''
        }`}
      />
      {meta.label}
    </span>
  )
}
