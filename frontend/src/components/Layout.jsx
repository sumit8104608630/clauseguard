import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { initials } from '../lib/format'
import ConfirmDialog from './ConfirmDialog'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/upload', label: 'Upload Contract', icon: UploadCloud, end: false },
]

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/clauseguard-logo.svg" alt="" className="h-8 w-8 rounded-md" />
      <div className="leading-tight">
        <p className="font-display text-base font-semibold text-white">
          ClauseGuard
        </p>
        <p className="text-[11px] text-slate-400">Contract Analyzer</p>
      </div>
    </div>
  )
}

function SidebarNav({ onNavigate, onClose }) {
  return (
    <>
      <div className="flex h-16 items-center justify-between gap-2 border-b border-slate-800 px-5">
        <Logo />
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `nav-item ${
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          RAG-powered risk review
        </div>
      </div>
    </>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [navOpen, setNavOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  // While the drawer is open: close on Escape and lock background scroll.
  useEffect(() => {
    if (!navOpen) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setNavOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [navOpen])

  async function handleLogout() {
    setSigningOut(true)
    try {
      await logout()
      toast.success('Signed out successfully')
      navigate('/login', { replace: true })
    } finally {
      setSigningOut(false)
      setConfirmOpen(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900 lg:flex">
        <SidebarNav />
      </aside>

      {/* Mobile / tablet drawer */}
      {navOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="animate-fade-in absolute inset-0 bg-slate-900/50"
            onClick={() => setNavOpen(false)}
          />
          <aside className="animate-drawer-in absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-slate-800 bg-slate-900 shadow-xl">
            <SidebarNav
              onNavigate={() => setNavOpen(false)}
              onClose={() => setNavOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Open navigation"
              className="btn btn-outline btn-sm -ml-0.5 px-2! lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>

            <img
              src="/clauseguard-logo.svg"
              alt=""
              className="h-7 w-7 rounded-md lg:hidden"
            />

            <div className="min-w-0">
              <h1 className="font-display truncate text-sm font-semibold text-slate-900 sm:text-base">
                Contract Dashboard
              </h1>
              <p className="hidden text-xs text-slate-500 sm:block">
                Upload, process and review your contracts
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden text-right md:block">
              <p className="text-sm font-medium text-slate-800">
                {user?.full_name || 'Signed in'}
              </p>
              <p className="max-w-[180px] truncate text-xs text-slate-500">
                {user?.email}
              </p>
            </div>

            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              {initials(user?.full_name, user?.email)}
            </span>

            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="btn btn-outline btn-sm"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:p-6">
          <Outlet />
        </main>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Sign out?"
        description="You will need to log in again to access your contracts."
        confirmLabel="Sign out"
        tone="danger"
        busy={signingOut}
        onConfirm={handleLogout}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
