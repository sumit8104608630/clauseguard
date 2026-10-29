import {
  CalendarClock,
  FileText,
  Hash,
  Layers,
  ShieldAlert,
  Tags,
} from 'lucide-react'
import { formatBytes, formatDateTime, riskMeta } from '../../lib/format'
import StatCard from '../StatCard'

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium break-words text-slate-800">{value}</p>
      </div>
    </div>
  )
}

const EMPTY_SCORECARD = { high: 0, medium: 0, low: 0, none: 0 }

export default function OverviewTab({ contract, clauses, scorecard }) {
  const counts = scorecard ?? EMPTY_SCORECARD
  const total = counts.high + counts.medium + counts.low + counts.none
  const sectionCount = new Set(
    clauses.map((clause) => clause.section_label).filter(Boolean),
  ).size
  const totalTokens = clauses.reduce(
    (sum, clause) => sum + (clause.token_count ?? 0),
    0,
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Layers}
          label="Clauses"
          value={clauses.length}
          hint="Extracted chunks"
          tone="brand"
        />
        <StatCard
          icon={Tags}
          label="Sections"
          value={sectionCount}
          hint="Labelled sections"
          tone="slate"
        />
        <StatCard
          icon={Hash}
          label="Tokens"
          value={totalTokens.toLocaleString()}
          hint="Approximate total"
          tone="emerald"
        />
        <StatCard
          icon={ShieldAlert}
          label="High risks"
          value={counts.high}
          hint={`${total} findings in total`}
          tone="rose"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
        {/* File details */}
        <section className="card p-4 sm:p-5">
          <h3 className="card-title">File details</h3>
          <div className="mt-2 divide-y divide-slate-100">
            <DetailRow icon={FileText} label="Filename" value={contract.filename} />
            <DetailRow
              icon={Layers}
              label="Size"
              value={formatBytes(contract.file_size)}
            />
            <DetailRow
              icon={CalendarClock}
              label="Uploaded"
              value={formatDateTime(contract.uploaded_at)}
            />
            <DetailRow
              icon={CalendarClock}
              label="Last risk review"
              value={
                contract.analyzed_at
                  ? formatDateTime(contract.analyzed_at)
                  : 'Not run yet'
              }
            />
          </div>
        </section>

        {/* Risk summary */}
        <section className="card p-4 sm:p-5">
          <h3 className="card-title">Risk summary</h3>

          {total === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No risk review has been run for this contract yet. Open the{' '}
              <span className="font-medium text-slate-700">Risk Analysis</span>{' '}
              tab to start one.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {['high', 'medium', 'low', 'none'].map((level) => {
                const meta = riskMeta(level)
                const count = counts[level] ?? 0
                const percent = Math.round((count / total) * 100)

                return (
                  <div key={level}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600">
                        {meta.label}
                      </span>
                      <span className="text-slate-500">
                        {count} · {percent}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${
                          level === 'high'
                            ? 'bg-rose-500'
                            : level === 'medium'
                              ? 'bg-amber-500'
                              : level === 'low'
                                ? 'bg-sky-500'
                                : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
