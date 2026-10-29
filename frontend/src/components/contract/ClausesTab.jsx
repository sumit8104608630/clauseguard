import { useMemo, useState } from 'react'
import { Layers, RefreshCw, Search, Tag, X } from 'lucide-react'
import { formatBytes } from '../../lib/format'
import EmptyState from '../EmptyState'
import Spinner from '../Spinner'

export default function ClausesTab({ clauses, loading, onReload }) {
  const [query, setQuery] = useState('')
  const [activeSection, setActiveSection] = useState(null)

  const sections = useMemo(() => {
    const counts = new Map()
    for (const clause of clauses) {
      if (!clause.section_label) continue
      counts.set(clause.section_label, (counts.get(clause.section_label) ?? 0) + 1)
    }
    return [...counts.entries()]
  }, [clauses])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return clauses.filter((clause) => {
      const matchesSection =
        !activeSection || clause.section_label === activeSection
      const matchesQuery =
        !needle ||
        (clause.text || '').toLowerCase().includes(needle) ||
        (clause.section_label || '').toLowerCase().includes(needle)
      return matchesSection && matchesQuery
    })
  }, [clauses, query, activeSection])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-500">
        <Spinner size="sm" />
        Loading clauses…
      </div>
    )
  }

  if (clauses.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="No clauses extracted yet"
        description="Clauses appear here once the contract has been processed. Run the ingestion pipeline to extract and index the text."
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-80">
          <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search within clauses…"
            className="input py-1.5 pr-3 pl-8"
          />
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span className="text-xs text-slate-500">
            {filtered.length} of {clauses.length} chunks
          </span>
          <button
            type="button"
            onClick={onReload}
            className="btn btn-outline btn-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reload
          </button>
        </div>
      </div>

      {/* Section chips */}
      {sections.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-slate-500">
            Sections:
          </span>

          {activeSection ? (
            <button
              type="button"
              onClick={() => setActiveSection(null)}
              className="chip bg-slate-800 text-white ring-slate-800"
            >
              Clear
              <X className="h-3 w-3" />
            </button>
          ) : null}

          {sections.map(([label, count]) => (
            <button
              key={label}
              type="button"
              onClick={() =>
                setActiveSection((current) => (current === label ? null : label))
              }
              className={`chip transition ${
                activeSection === label
                  ? 'bg-brand-50 text-brand-700 ring-brand-200'
                  : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              <Tag className="h-3 w-3" />
              {label}
              <span className="text-slate-400">{count}</span>
            </button>
          ))}
        </div>
      ) : null}

      {/* Clause list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No clauses match your filters"
          description="Try a different search term or clear the selected section."
        />
      ) : (
        <ol className="space-y-3">
          {filtered.map((clause) => (
            <li key={clause.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600">
                    #{clause.chunk_index}
                  </span>

                  {clause.section_label ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 ring-1 ring-brand-100 ring-inset">
                      <Tag className="h-3 w-3" />
                      {clause.section_label}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      No section label
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  {clause.token_count ? (
                    <span>{clause.token_count} tokens</span>
                  ) : null}
                  <span>{formatBytes((clause.text || '').length)}</span>
                </div>
              </div>

              <p className="mt-2.5 max-h-40 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
                {clause.text}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
