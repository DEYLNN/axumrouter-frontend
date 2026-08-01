import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'

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
      { path: '/admin/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      { path: '/admin/usage', label: 'Usage', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { path: '/admin/logs', label: 'Logs', icon: 'M4 16v4h4l10-10-4-4L4 16zm14-10l-4-4 2-2a1 1 0 011.414 0l2.586 2.586A1 1 0 0120 4l-2 2z' },
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
  const box = size === 'sm' ? 'w-8 h-8 rounded-xl' : 'w-9 h-9 rounded-xl'
  const icon = size === 'sm' ? 'w-4 h-4' : 'w-[18px] h-[18px]'
  return (
    <div className={`${box} bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/10`}>
      <svg className={`${icon} text-white`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    </div>
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
          <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500/90 font-nav">
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
                  className={`group relative flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-[13px] font-medium tracking-tight transition-all duration-200 font-nav ${
                    active
                      ? 'text-white bg-gradient-to-r from-indigo-500/20 to-purple-500/10 shadow-[inset_0_0_0_1px_rgba(129,140,248,0.25)]'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full bg-gradient-to-b from-indigo-400 to-purple-500 shadow-[0_0_10px_rgba(129,140,248,0.55)]" />
                  )}
                  <span
                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
                      active
                        ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-400/20'
                        : 'bg-white/[0.03] text-slate-500 group-hover:text-slate-300 group-hover:bg-white/[0.06]'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path d={n.icon} />
                    </svg>
                  </span>
                  <span>{n.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )

  return (
    <div className="min-h-screen bg-[#0B1220] text-slate-200 font-sans antialiased">
      {/* === DESKTOP SIDEBAR === */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col bg-[#0A0F1A]/95 backdrop-blur-xl border-r border-white/[0.05] z-30">
        <div className="absolute right-0 top-0 w-px h-full bg-gradient-to-b from-indigo-500/35 via-purple-500/15 to-transparent pointer-events-none" />

        <div className="relative flex items-center gap-3 px-4 h-16 border-b border-white/[0.05]">
          <BrandMark />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-white tracking-tight leading-none font-nav">AxumRouter</div>
            <div className="text-[10px] text-slate-500 mt-1 tracking-[0.12em] uppercase font-nav">AI Gateway</div>
          </div>
        </div>

        <nav className="flex-1 px-2.5 py-4 overflow-y-auto space-y-5">
          <NavLinks />
        </nav>

        <div className="px-3 py-3.5 border-t border-white/[0.05]">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-white/[0.02] ring-1 ring-white/[0.04]">
            <span className="relative flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-40" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] text-slate-500 font-medium font-nav">All systems normal</span>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 flex items-center gap-2.5 w-full px-2.5 py-2.5 rounded-xl text-[12px] font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all font-nav"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.03]">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </span>
            Logout
          </button>
        </div>
      </aside>

      {/* === MOBILE HEADER === */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 px-3 flex items-center justify-between bg-[#0B1220]/80 backdrop-blur-2xl border-b border-white/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06] hover:bg-white/[0.08] transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5 text-slate-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d={hamburger} />
            </svg>
          </button>
          <span className="text-[14px] font-semibold text-white tracking-tight truncate font-nav">AxumRouter</span>
        </div>

        <span className="shrink-0 max-w-[46%] truncate text-[11px] font-medium text-indigo-200/90 px-2.5 py-1 rounded-full bg-indigo-500/10 ring-1 ring-indigo-400/15 font-nav">
          {activeLabel}
        </span>
      </header>

      {/* === MOBILE DRAWER OVERLAY === */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/55 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* === MOBILE DRAWER === */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-50 h-full w-[17.5rem] max-w-[86vw] bg-[#0A0F1A]/95 backdrop-blur-2xl border-r border-white/[0.07] shadow-[20px_0_60px_rgba(0,0,0,0.45)] transform transition-transform duration-250 ease-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-indigo-500/40 via-purple-500/15 to-transparent pointer-events-none" />

        <div className="flex items-center justify-between px-3.5 h-14 border-b border-white/[0.05]">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandMark size="sm" />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-white tracking-tight leading-none font-nav">AxumRouter</div>
              <div className="text-[10px] text-slate-500 mt-1 tracking-[0.12em] uppercase font-nav">AI Gateway</div>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06] hover:bg-white/[0.08] transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-4.5 h-4.5 text-slate-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d={close} />
            </svg>
          </button>
        </div>

        <nav className="px-2.5 py-4 overflow-y-auto space-y-5 h-[calc(100%-8.5rem)]">
          <NavLinks onNavigate={() => setMobileOpen(false)} />
        </nav>

        <div className="absolute bottom-0 inset-x-0 px-3 pb-4 pt-3 border-t border-white/[0.05] bg-[#0A0F1A]/90 backdrop-blur-xl">
          <button
            onClick={() => {
              handleLogout()
              setMobileOpen(false)
            }}
            className="flex items-center gap-2.5 w-full px-2.5 py-2.5 rounded-xl text-[12px] font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all font-nav"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.03]">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </span>
            Logout
          </button>
        </div>
      </aside>

      <div className="lg:hidden h-14" />

      <main className="lg:pl-60 min-h-screen overflow-x-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
