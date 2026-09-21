import { useEffect, useState } from 'react'
import { getSettings } from '../api'
import { getProviders } from '../api/providers'
import { apiFetch } from '../api/client'
import type { SettingsData } from '../api'

interface Stats {
  db_size: string
  total_keys: number
  total_usage: number
  provider_count: number
}

const statIcons = {
  providers: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  keys: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
  requests: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  db: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4',
}

const chartBars = [
  [60, 30], [75, 20], [55, 40], [90, 10], [65, 25], [80, 15], [95, 5],
]

const chartDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function Dashboard() {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [stats, setStats] = useState<Stats>({ db_size: '—', total_keys: 0, total_usage: 0, provider_count: 0 })

  useEffect(() => {
    getSettings().then(s => setSettings(s)).catch(() => {})
    getProviders().then(p => setStats(s => ({ ...s, provider_count: p.length }))).catch(() => {})
  }, [])

  useEffect(() => {
    Promise.all([
      apiFetch('/database').then(r => r.json()).catch(() => ({})),
      apiFetch('/keys/stats').then(r => r.json()).catch(() => ({})),
      apiFetch('/usage/stats').then(r => r.json()).catch(() => ({})),
    ]).then(([db, keyStats, usageStats]) => {
      setStats(s => ({
        ...s,
        db_size: db.size_mb ? `${db.size_mb.toFixed(1)} MB` : '—',
        total_keys: keyStats.total || 0,
        total_usage: usageStats.total_requests || 0,
      }))
    }).catch(() => {})
  }, [])

  const baseUrl = settings?.public_url || import.meta.env.VITE_GATEWAY_BACKEND_URL || '—'

  const statCards = [
    { label: 'PROVIDERS', value: stats.provider_count, icon: statIcons.providers, iconBg: '#c8a2ff', pill: 'LIVE', pillBg: '#3ddc97' },
    { label: 'API KEYS', value: stats.total_keys, icon: statIcons.keys, iconBg: '#ff3d81', pill: 'ACTIVE', pillBg: '#3ddc97', whiteIcon: true },
    { label: 'REQUESTS', value: stats.total_usage, icon: statIcons.requests, iconBg: '#ffd23f', pill: 'TOTAL', pillBg: '#ffd23f' },
    { label: 'DB SIZE', value: stats.db_size, icon: statIcons.db, iconBg: '#ff6b5e', pill: 'SIZE', pillBg: '#c8a2ff' },
  ]

  return (
    <div className="relative">
      <div className="space-y-8">
        {/* Mobile-only page title (desktop header shows it) */}
        <div className="mb-2">
          <h1 className="heading-brutal text-3xl text-[#111111]">Dashboard</h1>
          <p className="mono-brutal text-xs text-gray-500 mt-1 uppercase">System overview & statistics</p>
        </div>

        {/* KPI GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map(s => (
            <div key={s.label} className="brutal-card p-6">
              <div className="flex justify-between items-start mb-4">
                <div
                  className="w-10 h-10 border-2 border-[#111111] rounded flex items-center justify-center"
                  style={{ background: s.iconBg }}
                >
                  <svg
                    className={`w-5 h-5 ${s.whiteIcon ? 'text-white' : 'text-[#111111]'}`}
                    fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                  >
                    <path d={s.icon} />
                  </svg>
                </div>
                <div className="status-pill text-[10px]" style={{ background: s.pillBg }}>{s.pill}</div>
              </div>
              <p className="mono-brutal text-3xl font-black text-[#111111]">{s.value}</p>
              <p className="text-sm font-bold uppercase tracking-wide text-[#111111] mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* CHART + BASE URL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bar chart (2/3) */}
          <div className="lg:col-span-2 brutal-card p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="heading-brutal text-2xl text-[#111111]">Requests Volume</h2>
                <p className="mono-brutal text-xs text-gray-500 uppercase">Last 7 days activity</p>
              </div>
              <div className="hidden sm:flex gap-2">
                <div className="flex items-center gap-2 px-3 py-1 border-2 border-[#111111] rounded-full text-xs font-bold">
                  <span className="w-3 h-3 bg-[#ff3d81] rounded-full border border-[#111111]" /> Incoming
                </div>
                <div className="flex items-center gap-2 px-3 py-1 border-2 border-[#111111] rounded-full text-xs font-bold">
                  <span className="w-3 h-3 bg-[#c8a2ff] rounded-full border border-[#111111]" /> Cached
                </div>
              </div>
            </div>

            <div className="h-[240px] flex items-end gap-3 pb-4 border-b-2 border-[#111111]">
              {chartBars.map(([a, b], i) => (
                <div key={i} className="flex-1 flex flex-col justify-end gap-1">
                  <div
                    className="w-full bg-[#ff3d81] border-2 border-[#111111] transition-all hover:opacity-90"
                    style={{ height: `${a}%` }}
                  />
                  <div
                    className="w-full bg-[#c8a2ff] border-2 border-[#111111] transition-all hover:opacity-90"
                    style={{ height: `${b}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 mono-brutal text-[10px] text-gray-500 uppercase">
              {chartDays.map(d => <span key={d}>{d}</span>)}
            </div>
          </div>

          {/* Base URL card (1/3) */}
          <div className="brutal-card p-6 flex flex-col">
            <h3 className="heading-brutal text-lg text-[#111111] mb-2">Base URL</h3>
            <p className="mono-brutal text-xs text-gray-500 uppercase mb-4">Public gateway endpoint</p>
            <code className="mono-brutal block text-xs text-[#111111] bg-[#fdf9f0] border-2 border-[#111111] rounded-lg px-4 py-3 truncate">
              {baseUrl}
            </code>
            <div className="mt-auto pt-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-[#3ddc97] border-2 border-[#111111] rounded-full" />
                <span className="text-sm font-bold text-[#111111]">Gateway online</span>
              </div>
              <p className="mono-brutal text-[10px] text-gray-500 mt-1 uppercase">All systems normal</p>
            </div>
          </div>
        </div>

        {/* QUICK LINKS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { label: 'ENDPOINT', path: '/admin/endpoint', desc: 'Gateway URL & keys', bg: '#ff3d81' },
            { label: 'PROVIDERS', path: '/admin/providers', desc: 'Manage LLM providers', bg: '#c8a2ff' },
            { label: 'SETTINGS', path: '/admin/settings', desc: 'Global configuration', bg: '#ffd23f' },
          ].map(c => (
            <a key={c.path} href={c.path} className="brutal-card p-5 block group">
              <div className="flex items-center justify-between">
                <div
                  className="w-9 h-9 border-2 border-[#111111] rounded flex items-center justify-center"
                  style={{ background: c.bg }}
                >
                  <svg className="w-4 h-4 text-[#111111]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M13 7l5 5-5 5M6 7l5 5-5 5" />
                  </svg>
                </div>
                <span className="mono-brutal text-[10px] text-gray-400 uppercase group-hover:text-[#111111] transition-colors">OPEN →</span>
              </div>
              <div className="heading-brutal text-base text-[#111111] mt-4">{c.label}</div>
              <div className="text-xs font-semibold text-gray-500 mt-1">{c.desc}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
