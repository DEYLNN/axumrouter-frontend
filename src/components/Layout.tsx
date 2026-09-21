import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'

const sections = [
  {
    label: 'Main',
    items: [
      { path: '/admin', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { path: '/admin/endpoint', label: 'Endpoint', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
      { path: '/admin/providers', label: 'Providers', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    ],
  },
  {
    label: 'Management',
    items: [
      { path: '/admin/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      { path: '/admin/usage', label: 'Usage', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { path: '/admin/quota', label: 'Quota', icon: 'M4 19h16M4 15h16M4 11h16M4 7h16' },
      { path: '/admin/logs', label: 'Logs', icon: 'M4 16v4h4l10-10-4-4L4 16zm14-10l-4-4 2-2a1 1 0 011.414 0l2.586 2.586A1 1 0 0120 4l-2 2z' },
      { path: '/admin/combos', label: 'Combos', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      { path: '/admin/playground', label: 'Playground', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
      { path: '/admin/auth-files', label: 'Auth Files', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      { path: '/admin/proxy-pool', label: 'Proxy Pool', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { path: '/admin/sources', label: 'Sources', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    ],
  },
]

const hamburger = 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5'
const close = 'M6 18L18 6M6 6l12 12'

function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
  return (
    <img
      src="/logo.png"
      alt="NuvCode"
      className={`${box} rounded-lg border-2 border-line object-cover shrink-0 bg-surface`}
    />
  )
}

export default function Layout() {
  const loc = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const isActive = (path: string) =>
    path === '/admin'
      ? loc.pathname === '/admin'
      : loc.pathname.startsWith(path)

  const activeLabel =
    sections.flatMap(s => s.items).find(n => isActive(n.path))?.label || 'Endpoint'

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {sections.map(section => (
        <div key={section.label} className="space-y-1">
          <div className="px-3 mb-3 mono-brutal text-[10px] text-subtext uppercase tracking-widest">
            {section.label}
          </div>
          <div className="space-y-1">
            {section.items.map(n => {
              const active = isActive(n.path)
              return (
                <Link
                  key={n.path}
                  to={n.path}
                  onClick={onNavigate}
                  className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-ink ${
                    active ? 'nav-item-active' : 'hover:bg-muted'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d={n.icon} />
                  </svg>
                  <span>{n.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )

  const ProfileCard = () => (
    <div className="brutal-card px-3 py-2.5 flex items-center">
      <p className="font-bold text-sm truncate text-ink">Admin</p>
    </div>
  )

  const LogoutBtn = ({ full = false }: { full?: boolean }) => (
    <button
      onClick={() => {
        handleLogout()
        if (full) setMobileOpen(false)
      }}
      className="brutal-btn w-full bg-surface px-3 py-2 text-[12px] font-bold text-ink"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      LOGOUT
    </button>
  )

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="grid-pattern" />

      {/* === DESKTOP SIDEBAR === */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[240px] flex-col bg-surface border-r-2 border-line z-40">
        <div className="p-6 flex items-center gap-3">
          <BrandMark />
          <span className="heading-brutal text-xl text-ink">NUVCODE</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
          <NavLinks />
        </nav>

        <div className="p-4 mt-auto border-t-2 border-line space-y-4">
          <ThemeToggle />
          <ProfileCard />
          <LogoutBtn />
        </div>
      </aside>

      {/* === MOBILE HEADER === */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-16 px-4 flex items-center justify-between bg-surface border-b-2 border-line">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="brutal-btn w-9 h-9 bg-surface !p-0"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5 text-ink" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d={hamburger} />
            </svg>
          </button>
          <span className="heading-brutal text-sm truncate text-ink">NUVCODE</span>
        </div>

        <span className="status-pill bg-[#ff3d81] text-on-accent shrink-0 max-w-[46%] truncate text-[10px]">
          {activeLabel}
        </span>
      </header>

      {/* === MOBILE DRAWER OVERLAY === */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* === MOBILE DRAWER === */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-50 h-full w-[17.5rem] max-w-[86vw] bg-surface border-r-2 border-line shadow-[4px_0_0px_0px_var(--shadow)] sm:shadow-[6px_0_0px_0px_var(--shadow)] lg:shadow-[8px_0_0px_0px_var(--shadow)] transform transition-transform duration-200 ease-out flex flex-col ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b-2 border-line shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandMark size="sm" />
            <span className="heading-brutal text-sm text-ink">NUVCODE</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="brutal-btn w-9 h-9 bg-surface !p-0"
            aria-label="Close menu"
          >
            <svg className="w-4 h-4 text-ink" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d={close} />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          <NavLinks onNavigate={() => setMobileOpen(false)} />
        </nav>

        <div className="shrink-0 p-4 border-t-2 border-line bg-surface space-y-4">
          <ThemeToggle compact />
          <ProfileCard />
          <LogoutBtn full />
        </div>
      </aside>

      <div className="lg:hidden h-16" />

      {/* === MAIN === */}
      <main className="lg:ml-[240px] min-h-screen relative z-10">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
