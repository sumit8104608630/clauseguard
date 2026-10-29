import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Info, UploadCloud } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import FileDropzone from '../components/FileDropzone'

const STEPS = [
  {
    title: 'Upload',
    description: 'The file is stored in Cloudinary and registered to your account.',
  },
  {
    title: 'Process',
    description:
      'Text is extracted, split into clause-aware chunks, embedded and indexed.',
  },
  {
    title: 'Review',
    description: 'Inspect the extracted clauses and the risk findings.',
  },
]

export default function Upload() {
  const { logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  async function handleUpload() {
    if (!file) {
      toast.warning('Choose a file to upload first.')
      return
    }

    setUploading(true)
    try {
      const result = await api.uploadContract(file)
      toast.success(`${result.filename} uploaded successfully`)
      navigate(`/contracts/${result.contract_id}`)
    } catch (error) {
      if (error.status === 401) {
        logout()
        return
      }
      toast.error(error.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
        <Link to="/" className="btn btn-outline btn-sm self-start">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
        <div className="min-w-0">
          <h2 className="page-title">Upload a contract</h2>
          <p className="text-sm text-slate-500">
            PDF or DOCX · processed in the background after upload
          </p>
        </div>
      </div>

      <div className="card p-4 sm:p-6">
        <FileDropzone
          file={file}
          onSelect={setFile}
          onClear={() => setFile(null)}
          busy={uploading}
        />

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => setFile(null)}
            disabled={!file || uploading}
            className="btn btn-outline"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="btn btn-primary"
          >
            {uploading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            {uploading ? 'Uploading…' : 'Upload contract'}
          </button>
        </div>
      </div>

      {/* What happens next */}
      <div className="card p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-slate-800">
          What happens after upload
        </h3>

        <ol className="mt-4 space-y-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {step.title}
                </p>
                <p className="text-xs text-slate-500">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" />
          <p className="text-xs text-sky-800">
            Uploads are stored in Cloudinary. If you see a
            &ldquo;missing permissions&rdquo; error, the API key needs the
            <span className="font-medium"> create/upload </span>
            permission in the Cloudinary console.
          </p>
        </div>
      </div>
    </div>
  )
}
