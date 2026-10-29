const TONES = {
  brand: 'bg-brand-50 text-brand-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-600',
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'brand',
}) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="overline">{label}</p>
          <p className="font-display mt-2 text-2xl font-semibold text-slate-900">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 truncate text-xs text-slate-400">{hint}</p>
          ) : null}
        </div>

        {Icon ? (
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${TONES[tone] ?? TONES.brand}`}
          >
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
    </div>
  )
}
