import { useMemo, useState } from 'react'
import {
  ChevronDown,
  Lightbulb,
  Play,
  Quote,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { riskMeta } from '../../lib/format'
import EmptyState from '../EmptyState'
import Spinner from '../Spinner'

const LEVELS = ['all', 'high', 'medium', 'low', 'none']

function RiskCard({ risk, clause, expanded, onToggle }) {
  const meta = riskMeta(risk.risk_level)
  const source = clause?.section_label || (clause ? `Chunk #${clause.chunk_index}` : null)

  return (
    <div className="card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 p-3.5 text-left sm:items-center sm:p-4"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${meta.className}`}
          >
            {risk.risk_level === 'none' ? (
              <ShieldCheck className="h-4 w-4" />
            ) : (
              <ShieldAlert className="h-4 w-4" />
            )}
          </span>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
              {risk.category}
            </p>
            <p className="text-xs text-slate-500">
              {Math.round((risk.confidence ?? 0) * 100)}% confidence
              {source ? ` · ${source}` : ''}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.className}`}
          >
            {meta.label}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {expanded ? (
        <div className="space-y-3 border-t border-slate-100 px-4 py-3.5">
          <div>
            <p className="mb-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              Why it matters
            </p>
            <p className="text-sm leading-relaxed text-slate-700">
              {risk.explanation}
            </p>
          </div>

          {risk.suggested_fix ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-emerald-700 uppercase">
                <Lightbulb className="h-3 w-3" />
                Suggested fix
              </p>
              <p className="text-sm leading-relaxed text-emerald-900">
                {risk.suggested_fix}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              No remediation needed for this category.
            </p>
          )}

          {clause ? (
            <div className="rounded-md bg-slate-50 px-3 py-2">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                <Quote className="h-3 w-3" />
                Source clause
              </p>
              <p className="line-clamp-4 text-xs leading-relaxed text-slate-600">
                {clause.text}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default function RisksTab({
  results,
  clauses,
  loading,
  canRun,
  running,
  onRun,
}) {
  const [level, setLevel] = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  const clausesById = useMemo(
    () => new Map((clauses ?? []).map((clause) => [clause.id, clause])),
    [clauses],
  )

  const counts = useMemo(() => {
    const tally = { high: 0, medium: 0, low: 0, none: 0 }
    for (const risk of results ?? []) {
      if (tally[risk.risk_level] !== undefined) tally[risk.risk_level] += 1
    }
    return tally
  }, [results])

  const filtered = useMemo(
    () =>
      level === 'all'
        ? (results ?? [])
        : (results ?? []).filter((risk) => risk.risk_level === level),
    [results, level],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-16 text-sm text-slate-500">
        <Spinner size="sm" />
        Loading analysis…
      </div>
    )
  }

  if (!results?.length) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title={canRun ? 'No analysis yet' : 'Nothing to analyse'}
        description={
          canRun
            ? 'ClauseGuard will score this contract against indemnification, liability, termination, confidentiality, payment, IP and governing-law risk.'
            : 'Process the contract first so its clauses can be extracted, then run the risk review.'
        }
        action={
          canRun ? (
            <button
              type="button"
              onClick={onRun}
              disabled={running}
              className="btn btn-primary btn-sm"
            >
              {running ? (
                <Spinner size="sm" className="h-3.5! w-3.5!" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {running ? 'Starting…' : 'Run analysis'}
            </button>
          ) : null
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {LEVELS.map((value) => {
          const count =
            value === 'all'
              ? (results?.length ?? 0)
              : (counts[value] ?? 0)

          return (
            <button
              key={value}
              type="button"
              onClick={() => setLevel(value)}
              className={`seg-btn ${
                level === value
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {value === 'all' ? 'All' : riskMeta(value).label}
              <span className="ml-1.5 text-slate-400">{count}</span>
            </button>
          )
        })}

        <button
          type="button"
          onClick={onRun}
          disabled={running}
          className="btn btn-outline btn-sm ml-auto"
        >
          {running ? (
            <Spinner size="sm" className="h-3.5! w-3.5!" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          Re-run analysis
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nothing in this category"
          description="No findings match the selected severity level."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((risk) => (
            <RiskCard
              key={risk.id}
              risk={risk}
              clause={clausesById.get(risk.clause_id)}
              expanded={expandedId === risk.id}
              onToggle={() =>
                setExpandedId((current) => (current === risk.id ? null : risk.id))
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
