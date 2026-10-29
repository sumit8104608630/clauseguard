import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Download,
  ExternalLink,
  FileQuestion,
  FileText,
  Layers,
  Play,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { formatBytes, formatDateTime, isPdf } from '../lib/format'
import StatusBadge from '../components/StatusBadge'
import Spinner, { FullPageLoader } from '../components/Spinner'
import OverviewTab from '../components/contract/OverviewTab'
import ClausesTab from '../components/contract/ClausesTab'
import RisksTab from '../components/contract/RisksTab'
import ChatTab from '../components/contract/ChatTab'

const TABS = [
  { id: 'overview', label: 'Overview', icon: Layers },
  { id: 'clauses', label: 'Clauses', icon: FileText },
  { id: 'risks', label: 'Risk Analysis', icon: ShieldAlert },
  { id: 'chat', label: 'Chat', icon: Sparkles },
]

export default function ContractDetail() {
  const { contractId } = useParams()
  const { logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [contract, setContract] = useState(null)
  const [clauses, setClauses] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [clausesLoading, setClausesLoading] = useState(true)
  const [analysisLoading, setAnalysisLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [starting, setStarting] = useState(false)
  const [analysisStarting, setAnalysisStarting] = useState(false)
  const [tab, setTab] = useState('overview')

  const risks = analysis?.results ?? []

  const loadClauses = useCallback(async () => {
    setClausesLoading(true)
    try {
      const data = await api.getClauses(contractId)
      setClauses(data ?? [])
    } catch (error) {
      if (error.status === 401) {
        logout()
        return
      }
      // A contract that has never been processed simply has no clauses yet.
      if (error.status !== 404) {
        toast.error(error.message || 'Failed to load clauses')
      }
      setClauses([])
    } finally {
      setClausesLoading(false)
    }
  }, [contractId, logout, toast])

  const loadAnalysis = useCallback(async () => {
    setAnalysisLoading(true)
    try {
      const data = await api.getAnalysis(contractId)
      setAnalysis(data)
    } catch (error) {
      if (error.status === 401) {
        logout()
        return
      }
      // No findings yet is not an error — it just means nothing has been run.
      if (error.status !== 404) {
        toast.error(error.message || 'Failed to load risk analysis')
      }
      setAnalysis(null)
    } finally {
      setAnalysisLoading(false)
    }
  }, [contractId, logout, toast])

  const loadContract = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true)
      try {
        const data = await api.getContract(contractId)
        setContract(data)
        setNotFound(false)
        return data
      } catch (error) {
        if (error.status === 401) {
          logout()
          return null
        }
        if (error.status === 404) {
          setNotFound(true)
          return null
        }
        toast.error(error.message || 'Failed to load contract')
        return null
      } finally {
        setLoading(false)
      }
    },
    [contractId, logout, toast],
  )

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const data = await loadContract()
      if (cancelled || !data) return
      await Promise.all([loadClauses(), loadAnalysis()])
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [loadContract, loadClauses, loadAnalysis])

  const isProcessing =
    contract?.status === 'processing' || contract?.status === 'analyzing'

  // Ingestion and risk analysis both run as background tasks on the server,
  // so poll until the contract settles.
  useEffect(() => {
    if (!isProcessing) return undefined

    const interval = setInterval(async () => {
      const data = await loadContract({ silent: true })
      if (
        data &&
        data.status !== 'processing' &&
        data.status !== 'analyzing'
      ) {
        await Promise.all([loadClauses(), loadAnalysis()])
        if (data.status === 'analyzed') {
          toast.success('Analysis complete')
        }
        if (data.status === 'processed') {
          toast.success('Contract processed')
        }
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [isProcessing, loadContract, loadClauses, loadAnalysis, toast])

  async function handleProcess() {
    setStarting(true)
    try {
      await api.processContract(contractId)
      toast.info('Processing started — this can take a moment.')
      await loadContract({ silent: true })
    } catch (error) {
      if (error.status === 401) {
        logout()
        return
      }
      toast.error(error.message || 'Could not start processing')
    } finally {
      setStarting(false)
    }
  }

  async function handleRunAnalysis() {
    setAnalysisStarting(true)
    try {
      await api.runAnalysis(contractId)
      toast.info('Risk review started — this can take a moment.')
      await loadContract({ silent: true })
    } catch (error) {
      if (error.status === 401) {
        logout()
        return
      }
      toast.error(error.message || 'Could not start the risk review')
    } finally {
      setAnalysisStarting(false)
    }
  }

  if (loading) {
    return <FullPageLoader label="Loading contract…" />
  }

  const canRunAnalysis = clauses.length > 0 && !isProcessing

  if (notFound || !contract) {
    return (
      <div className="mx-auto w-full max-w-lg">
        <div className="card p-8 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <FileQuestion className="h-6 w-6" />
          </span>
          <h2 className="text-sm font-semibold text-slate-800">
            Contract not found
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            It may have been deleted, or it belongs to another account.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn btn-primary btn-sm mt-5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Link to="/" className="btn btn-outline btn-sm mt-0.5 shrink-0">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>

          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
              isPdf(contract.filename)
                ? 'bg-rose-50 text-rose-600'
                : 'bg-sky-50 text-sky-600'
            }`}
          >
            <FileText className="h-5 w-5" />
          </span>

          <div className="min-w-0">
            <h2 className="page-title truncate text-lg sm:text-xl">
              {contract.filename}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <StatusBadge status={contract.status} />
              <span>{formatBytes(contract.file_size)}</span>
              <span>Uploaded {formatDateTime(contract.uploaded_at)}</span>
              <span>
                {contract.analyzed_at
                  ? `Analyzed ${formatDateTime(contract.analyzed_at)}`
                  : 'Not analyzed yet'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={contract.cloudinary_url}
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline btn-sm grow justify-center sm:grow-0"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open original
          </a>

          <a
            href={contract.cloudinary_url}
            download={contract.filename}
            className="btn btn-outline btn-sm grow justify-center sm:grow-0"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </a>

          <button
            type="button"
            onClick={handleProcess}
            disabled={starting || isProcessing}
            className="btn btn-outline btn-sm grow justify-center sm:grow-0"
          >
            {starting || isProcessing ? (
              <Spinner size="sm" className="h-3.5! w-3.5!" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {isProcessing
              ? 'Working…'
              : contract.status === 'processed' ||
                  contract.status === 'analyzed'
                ? 'Re-extract clauses'
                : 'Process contract'}
          </button>

          <button
            type="button"
            onClick={handleRunAnalysis}
            disabled={analysisStarting || isProcessing || !canRunAnalysis}
            title={
              canRunAnalysis
                ? undefined
                : 'Process the contract first to extract its clauses'
            }
            className="btn btn-primary btn-sm grow justify-center sm:grow-0"
          >
            {analysisStarting || isProcessing ? (
              <Spinner size="sm" className="h-3.5! w-3.5!" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {contract.analyzed_at ? 'Re-run risk review' : 'Run risk review'}
          </button>
        </div>
      </div>

      {isProcessing ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-amber-600" />
          <p className="text-xs text-amber-800">
            Extraction, indexing or the risk review is running in the
            background. This page refreshes automatically.
          </p>
        </div>
      ) : null}

      {contract.status === 'failed' ? (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <p className="text-xs text-rose-800">
            The last background run failed. Check the backend logs, then retry
            with &ldquo;Process contract&rdquo; or &ldquo;Run risk
            review&rdquo;.
          </p>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = tab === id
            const count =
              id === 'clauses'
                ? clauses.length
                : id === 'risks'
                  ? risks.length
                  : null

            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition sm:px-3.5 ${
                  isActive
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {count !== null ? (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {tab === 'overview' ? (
          <OverviewTab
            contract={contract}
            clauses={clauses}
            scorecard={analysis?.scorecard}
          />
        ) : null}

        {tab === 'clauses' ? (
          <ClausesTab
            clauses={clauses}
            loading={clausesLoading}
            onReload={loadClauses}
          />
        ) : null}

        {tab === 'risks' ? (
          <RisksTab
            results={risks}
            clauses={clauses}
            loading={analysisLoading}
            canRun={canRunAnalysis}
            running={analysisStarting || isProcessing}
            onRun={handleRunAnalysis}
          />
        ) : null}

        {tab === 'chat' ? (
          <ChatTab
            contractId={contractId}
            clauses={clauses}
            canAsk={clauses.length > 0 && !isProcessing}
          />
        ) : null}
      </div>
    </div>
  )
}
