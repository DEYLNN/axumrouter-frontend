import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'

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
      { path: '/admin/logs', label: 'Logs', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      { path: '/admin/usage', label: 'Usage', icon: 'M13 10V3L4 14h7v7l9-13h-7z' },
      { path: '/admin/quota', label: 'Quota', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      { path: '/admin/auth-files', label: 'Auth Files', icon: 'M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2' },
      { path: '/admin/proxy-pool', label: 'Proxy Pool', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { path: '/admin/playground', label: 'Playground', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
      { path: '/admin/combos', label: 'Combos', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
    ],
  },
]

const hamburger = 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5'
const close = 'M6 18L18 6M6 6l12 12'

export default function Layout() {
  const loc = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (path: string) =>
    path === '/admin'
      ? loc.pathname === '/admin'
      : loc.pathname.startsWith(path)

  const NavLinks = () => (
    <>
      {sections.map(section => (
        <div key={section.label}>
          <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {section.label}
          </div>
          <div className="space-y-0.5">
            {section.items.map(n => {
              const active = isActive(n.path)
              return (
                <Link
                  key={n.path}
                  to={n.path}
                  onClick={() => setMobileOpen(false)}
                  className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'text-cyan-300 bg-cyan-500/[0.08] shadow-sm shadow-cyan-500/5'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
                  )}
                  <svg
                    className={`w-4 h-4 flex-shrink-0 transition-all duration-200 ${
                      active ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                    fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                  >
                    <path d={n.icon} />
                  </svg>
                  {n.label}
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
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col bg-[#0B1220] border-r border-white/[0.04] z-30">
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-white/[0.04]">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">AxumRouter</span>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
          <NavLinks />
        </nav>

        <div className="px-5 py-3.5 border-t border-white/[0.04]">
          <div className="flex items-center gap-2.5">
            <span className="relative flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-40" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-green-500" />
            </span>
            <span className="text-[11px] text-slate-500 font-medium">All systems normal</span>
          </div>
        </div>
      </aside>

      {/* === MOBILE HEADER === */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between h-14 px-4 border-b border-white/[0.04] bg-[#0B1220]/90 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors -ml-1"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d={hamburger} />
            </svg>
          </button>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">AxumRouter</span>
        </div>

        {/* Active page label on right */}
        <span className="text-[11px] font-medium text-slate-500 truncate max-w-[120px]">
          {sections.flatMap(s => s.items).find(n => isActive(n.path))?.label || 'Endpoint'}
        </span>
      </header>

      {/* === MOBILE DRAWER OVERLAY === */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* === MOBILE DRAWER === */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-50 h-full w-64 bg-[#0B1220] border-r border-white/[0.06] transform transition-transform duration-200 ease-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.04]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">AxumRouter</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d={close} />
            </svg>
          </button>
        </div>

        <nav className="px-3 py-4 overflow-y-auto space-y-5 h-[calc(100%-3.5rem)]">
          <NavLinks />
        </nav>
      </aside>

      {/* Spacer for mobile header */}
      <div className="lg:hidden h-14" />

      {/* === MAIN CONTENT === */}
      <main className="lg:pl-60 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
