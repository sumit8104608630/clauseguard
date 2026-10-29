import { useRef, useState } from 'react'
import { FileText, Loader2, UploadCloud, X } from 'lucide-react'
import { formatBytes } from '../lib/format'

export const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const MAX_SIZE = 25 * 1024 * 1024

export default function FileDropzone({
  file,
  onSelect,
  onClear,
  busy = false,
  disabled = false,
}) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')

  function validate(candidate) {
    if (!candidate) return ''

    const looksAllowed =
      ACCEPTED_TYPES.includes(candidate.type) ||
      /\.(pdf|docx)$/i.test(candidate.name)

    if (!looksAllowed) return 'Only PDF and DOCX files are allowed.'
    if (candidate.size > MAX_SIZE) return 'File is larger than the 25 MB limit.'
    if (candidate.size === 0) return 'That file appears to be empty.'

    return ''
  }

  function handleFiles(fileList) {
    const candidate = fileList?.[0]
    if (!candidate) return

    const validationError = validate(candidate)
    setError(validationError)

    if (!validationError) onSelect(candidate)
  }

  const blocked = busy || disabled

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault()
          if (!blocked) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (!blocked) handleFiles(event.dataTransfer.files)
        }}
        onClick={() => !blocked && inputRef.current?.click()}
        role="button"
        tabIndex={blocked ? -1 : 0}
        onKeyDown={(event) => {
          if (blocked) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition sm:px-6 sm:py-10 ${
          dragging
            ? 'border-brand-500 bg-brand-50'
            : 'border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-brand-50/40'
        } ${blocked ? 'pointer-events-none opacity-60' : ''}`}
      >
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm ring-1 ring-slate-200">
          <UploadCloud className="h-6 w-6" />
        </span>

        <p className="text-sm font-medium text-slate-800">
          Drag &amp; drop your contract here
        </p>
        <p className="mt-1 text-xs text-slate-500">
          or <span className="font-medium text-brand-600">browse</span> — PDF or
          DOCX, up to 25 MB
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
          disabled={blocked}
        />
      </div>

      {error ? (
        <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>
      ) : null}

      {file ? (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
            <FileText className="h-4 w-4" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">
              {file.name}
            </p>
            <p className="text-xs text-slate-500">
              {formatBytes(file.size)}
              {busy ? ' · uploading…' : ''}
            </p>
          </div>

          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
          ) : (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setError('')
                onClear()
              }}
              aria-label="Remove file"
              className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
