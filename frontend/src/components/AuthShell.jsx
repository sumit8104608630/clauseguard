import { ShieldCheck } from 'lucide-react'

const HIGHLIGHTS = [
  'Upload PDF or DOCX contracts securely',
  'Automatic clause extraction and chunking',
  'RAG-powered risk review with citations',
]

const YEAR = new Date().getFullYear()

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen bg-paper">
      {/* Brand panel — desktop only */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-slate-900 p-10 lg:flex lg:w-1/2 xl:p-14">
        <div className="flex items-center gap-3">
          <img
            src="/clauseguard-logo.svg"
            alt=""
            className="h-10 w-10 rounded-lg"
          />
          <div>
            <p className="font-display text-lg font-semibold text-white">
              ClauseGuard
            </p>
            <p className="text-xs text-slate-400">Contract Analyzer</p>
          </div>
        </div>

        <div>
          <h2 className="font-display max-w-md text-3xl leading-tight font-semibold text-white xl:text-4xl">
            Understand every clause before you sign.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
            ClauseGuard ingests your contracts, indexes them in a vector store,
            and surfaces the risks that actually matter.
          </p>

          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 text-sm text-slate-300"
              >
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-slate-500">
          © {YEAR} ClauseGuard. All rights reserved.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center px-4 py-8 sm:px-6 lg:w-1/2 lg:py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <img
              src="/clauseguard-logo.svg"
              alt=""
              className="h-9 w-9 rounded-lg"
            />
            <div>
              <p className="font-display text-base font-semibold text-slate-900">
                ClauseGuard
              </p>
              <p className="text-xs text-slate-500">Contract Analyzer</p>
            </div>
          </div>

          <h1 className="font-display text-xl font-semibold text-slate-900 sm:text-2xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          ) : null}

          <div className="card mt-6 p-4 sm:p-6">{children}</div>

          {footer ? <div className="mt-4 text-center">{footer}</div> : null}
        </div>
      </div>
    </div>
  )
}
