import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileStack,
  FileText,
  Play,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { formatBytes, formatRelative, isPdf } from '../lib/format'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import Pagination from '../components/Pagination'
import EmptyState from '../components/EmptyState'
import Spinner, { FullPageLoader } from '../components/Spinner'

const PAGE_SIZE = 10

// The list endpoint is paginated; we pull one generous page so the stat cards
// and the search/filter box can operate on the full set client-side.
const FETCH_SIZE = 100

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'uploaded', label: 'Uploaded' },
  { value: 'processing', label: 'Processing' },
  { value: 'processed', label: 'Processed' },
  { value: 'analyzing', label: 'Analyzing' },
  { value: 'analyzed', label: 'Analyzed' },
  { value: 'failed', label: 'Failed' },
]

export default function Dashboard() {
  const { logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [contracts, setContracts] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [processingId, setProcessingId] = useState(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const data = await api.listContracts({ page: 1, size: FETCH_SIZE })
        setContracts(data?.items ?? [])
        setTotal(data?.total ?? 0)
      } catch (error) {
        if (error.status === 401) {
          logout()
          return
        }
        toast.error(error.message || 'Failed to load contracts')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [logout, toast],
  )

  useEffect(() => {
    load()
  }, [load])

  const hasProcessing = contracts.some(
    (item) => item.status === 'processing' || item.status === 'analyzing',
  )

  // Ingestion runs in a background task, so poll while anything is processing.
  useEffect(() => {
    if (!hasProcessing) return undefined

    const interval = setInterval(() => load({ silent: true }), 5000)
    return () => clearInterval(interval)
  }, [hasProcessing, load])

  const stats = useMemo(() => {
    const counts = {
      analyzed: 0,
      processing: 0,
      analyzing: 0,
      processed: 0,
      uploaded: 0,
      failed: 0,
    }
    for (const contract of contracts) {
      if (counts[contract.status] !== undefined) counts[contract.status] += 1
    }
    return counts
  }, [contracts])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return contracts.filter((contract) => {
      const matchesStatus =
        statusFilter === 'all' || contract.status === statusFilter
      const matchesQuery =
        !needle || (contract.filename || '').toLowerCase().includes(needle)
      return matchesStatus && matchesQuery
    })
  }, [contracts, query, statusFilter])

  // Reset to the first page whenever the result set shrinks/changes.
  useEffect(() => {
    setPage(1)
  }, [query, statusFilter])

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleProcess(contract) {
    setProcessingId(contract.id)
    try {
      await api.processContract(contract.id)
      toast.success(`Processing started for ${contract.filename}`)
      await load({ silent: true })
    } catch (error) {
      if (error.status === 401) {
        logout()
        return
      }
      toast.error(error.message || 'Could not start processing')
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return <FullPageLoader label="Loading your contracts…" />
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="page-title">Overview</h2>
          <p className="text-sm text-slate-500">
            {total} contract{total === 1 ? '' : 's'} in your workspace
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => load({ silent: true })}
            disabled={refreshing}
            className="btn btn-outline btn-sm"
          >
            {refreshing ? (
              <Spinner size="sm" className="h-3.5! w-3.5!" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </button>

          <Link to="/upload" className="btn btn-primary btn-sm">
            Upload contract
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard
          icon={FileStack}
          label="Total"
          value={total}
          hint="All contracts"
          tone="brand"
        />
        <StatCard
          icon={CheckCircle2}
          label="Analyzed"
          value={stats.analyzed}
          hint="Ready for review"
          tone="emerald"
        />
        <StatCard
          icon={Clock}
          label="In flight"
          value={stats.processing + stats.analyzing}
          hint={hasProcessing ? 'Auto-refreshing…' : 'Nothing in flight'}
          tone="amber"
        />
        <StatCard
          icon={XCircle}
          label="Failed"
          value={stats.failed}
          hint={stats.failed ? 'Needs attention' : 'No failures'}
          tone="rose"
        />
      </div>

      {/* Table card */}
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:w-72">
            <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by filename…"
              className="input py-1.5 pr-3 pl-8"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                className={`seg-btn ${
                  statusFilter === filter.value
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {contracts.length === 0 ? (
          <EmptyState
            icon={FileStack}
            title="No contracts yet"
            description="Upload a PDF or DOCX contract to get started. ClauseGuard will extract the clauses and prepare it for risk review."
            action={
              <Link to="/upload" className="btn btn-primary btn-sm">
                Upload your first contract
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matches"
            description="No contracts match your search or filter."
          />
        ) : (
          <>
            {/* Desktop / tablet: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="overline px-4 py-2.5">Contract</th>
                    <th className="overline px-4 py-2.5">Status</th>
                    <th className="overline px-4 py-2.5">Uploaded</th>
                    <th className="overline px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {pageItems.map((contract) => {
                    const isProcessing =
                      contract.status === 'processing' ||
                      processingId === contract.id

                    return (
                      <tr
                        key={contract.id}
                        onClick={() => navigate(`/contracts/${contract.id}`)}
                        className="cursor-pointer transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                                isPdf(contract.filename)
                                  ? 'bg-rose-50 text-rose-600'
                                  : 'bg-sky-50 text-sky-600'
                              }`}
                            >
                              <FileText className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="max-w-[280px] truncate text-sm font-medium text-slate-800">
                                {contract.filename}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatBytes(contract.file_size)}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge status={contract.status} />
                        </td>

                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-700">
                            {formatRelative(contract.uploaded_at)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {contract.analyzed_at
                              ? `Analyzed ${formatRelative(contract.analyzed_at)}`
                              : 'Not analyzed'}
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleProcess(contract)
                              }}
                              disabled={isProcessing}
                              className="btn btn-outline btn-sm"
                            >
                              {isProcessing ? (
                                <Spinner size="sm" className="h-3.5! w-3.5!" />
                              ) : (
                                <Play className="h-3.5 w-3.5" />
                              )}
                              {contract.status === 'analyzed'
                                ? 'Re-process'
                                : 'Process'}
                            </button>

                            <Link
                              to={`/contracts/${contract.id}`}
                              onClick={(event) => event.stopPropagation()}
                              className="btn btn-ghost btn-sm text-brand-700"
                            >
                              View
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Phones: stacked cards */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {pageItems.map((contract) => {
                const isProcessing =
                  contract.status === 'processing' ||
                  processingId === contract.id

                return (
                  <li key={contract.id} className="p-3">
                    <div
                      onClick={() => navigate(`/contracts/${contract.id}`)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                            isPdf(contract.filename)
                              ? 'bg-rose-50 text-rose-600'
                              : 'bg-sky-50 text-sky-600'
                          }`}
                        >
                          <FileText className="h-4 w-4" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">
                            {contract.filename}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {formatBytes(contract.file_size)} ·{' '}
                            {formatRelative(contract.uploaded_at)}
                          </p>
                        </div>

                        <StatusBadge status={contract.status} />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleProcess(contract)}
                        disabled={isProcessing}
                        className="btn btn-outline btn-sm flex-1"
                      >
                        {isProcessing ? (
                          <Spinner size="sm" className="h-3.5! w-3.5!" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                        {contract.status === 'analyzed' ? 'Re-process' : 'Process'}
                      </button>

                      <Link
                        to={`/contracts/${contract.id}`}
                        className="btn btn-primary btn-sm flex-1"
                      >
                        View
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>

            <Pagination
              page={page}
              size={PAGE_SIZE}
              total={filtered.length}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      {contracts.length > 0 && stats.processing > 0 ? (
        <p className="text-center text-xs text-slate-500">
          {stats.processing} contract{stats.processing === 1 ? '' : 's'}{' '}
          currently processing — the table refreshes automatically.
        </p>
      ) : null}
    </div>
  )
}
