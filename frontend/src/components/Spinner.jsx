import { LoaderCircle } from 'lucide-react'

const SIZES = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-9 w-9' }

/** Inline loading spinner. `size` is one of `sm` | `md` | `lg`. */
export default function Spinner({ size = 'md', className = '' }) {
  return (
    <LoaderCircle
      aria-hidden="true"
      className={`animate-spin text-brand-600 ${SIZES[size] ?? SIZES.md} ${className}`}
    />
  )
}

/** Centred spinner + label, for whole-page loading states. */
export function FullPageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  )
}
