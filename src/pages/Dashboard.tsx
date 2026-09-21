import { useEffect, useState } from 'react'
import { getSettings } from '../api'
import { getProviders } from '../api/providers'
import { apiFetch } from '../api/client'
import type { SettingsData } from '../api'

const chartBars = [
  [60, 30], [75, 20], [55, 40], [90, 10], [65, 25], [80, 15], [95, 5],
]

const chartDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/* ─── Icons ─── */
const ICONS = {
  requests: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  tokens: 'M13 10V3L4 14h7v7l9-11h-7z',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
}

const ICON_BG: Record<string, string> = {
  requests: 'var(--primary)',
  tokens: 'var(--accent)',
  clock: 'var(--warning)',
}

function StatIcon({ name }: { name: keyof typeof ICONS }) {
  return (
    <div
      className="w-10 h-10 border-2 border-line rounded flex items-center justify-center shrink-0"
      style={{ background: ICON_BG[name] }}
    >
      <svg className="w-5 h-5 text-on-accent" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d={ICONS[name]} />
      </svg>
    </div>
  )
}

/** "1s ago" / "5m ago" / "2h ago" / "3d ago" — DB stores UTC */
function timeAgo(dt: string): string {
  const t = new Date(dt.replace(' ', 'T') + 'Z')
  const diff = Math.floor((Date.now() - t.getTime()) / 1000)
  if (diff < 0) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function Dashboard() {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [providerCount, setProviderCount] = useState(0)
  const [totalRequests, setTotalRequests] = useState(0)
  const [totalTokens, setTotalTokens] = useState(0)
  const [todayRequests, setTodayRequests] = useState(0)
  const [todayTokens, setTodayTokens] = useState(0)
  const [lastRequestAgo, setLastRequestAgo] = useState('—')

  useEffect(() => {
    getSettings().then(s => setSettings(s)).catch(() => {})
    getProviders().then(p => setProviderCount(p.length)).catch(() => {})
  }, [])

  useEffect(() => {
    Promise.all([
      apiFetch('/usage/stats').then(r => r.json()).catch(() => ({})),
      apiFetch('/logs?limit=200').then(r => r.json()).catch(() => ({})),
    ]).then(([usageStats, logsData]) => {
      setTotalRequests(usageStats.total_requests || 0)
      const tokens = usageStats.total_tokens
        || (usageStats.total_prompt_tokens || 0) + (usageStats.total_completion_tokens || 0)
      setTotalTokens(tokens)

      const today = new Date().toISOString().slice(0, 10) // UTC, matches DB
      const logs: Array<{ created_at: string; total_tokens: number }> = logsData.logs || []
      const todayLogs = logs.filter(l => l.created_at.startsWith(today))
      setTodayRequests(todayLogs.length)
      setTodayTokens(todayLogs.reduce((s, l) => s + (l.total_tokens || 0), 0))

      if (logs.length > 0) setLastRequestAgo(timeAgo(logs[0].created_at))
    }).catch(() => {})
  }, [])

  // refresh "time ago" every 15s
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const r = await apiFetch('/logs?limit=1')
        const d = await r.json()
        if (d.logs?.length) setLastRequestAgo(timeAgo(d.logs[0].created_at))
      } catch { /* ignore */ }
    }, 15000)
    return () => clearInterval(id)
  }, [])

  const baseUrl = settings?.public_url || import.meta.env.VITE_GATEWAY_BACKEND_URL || '—'
  const fmt = (n: number) => n.toLocaleString('en-US')

  return (
    <div className="relative">
      <div className="space-y-8">
        {/* Mobile-only page title (desktop header shows it) */}
        <div className="mb-2">
          <h1 className="heading-brutal text-3xl text-ink">Dashboard</h1>
          <p className="mono-brutal text-xs text-subtext mt-1 uppercase">System overview & statistics</p>
        </div>

        {/* STAT CARDS — 3 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 — Requests */}
          <div className="brutal-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <StatIcon name="requests" />
              <p className="mono-brutal text-xs text-subtext uppercase">Requests</p>
            </div>
            <p className="text-3xl font-black heading-brutal text-ink">{fmt(totalRequests)}</p>
            <div className="border-t-2 border-line mt-4 pt-3">
              <p className="text-xs mono-brutal text-subtext uppercase">Today: {todayRequests} requests</p>
            </div>
          </div>

          {/* Card 2 — Total Tokens */}
          <div className="brutal-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <StatIcon name="tokens" />
              <p className="mono-brutal text-xs text-subtext uppercase">Total Tokens</p>
            </div>
            <p className="text-3xl font-black heading-brutal text-ink">{fmt(totalTokens)}</p>
            <div className="border-t-2 border-line mt-4 pt-3">
              <p className="text-xs mono-brutal text-subtext uppercase">Today: {fmt(todayTokens)} tokens</p>
            </div>
          </div>

          {/* Card 3 — Last Request */}
          <div className="brutal-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <StatIcon name="clock" />
              <p className="mono-brutal text-xs text-subtext uppercase">Last Request</p>
            </div>
            <p className="text-3xl font-black heading-brutal text-ink">{lastRequestAgo}</p>
            <div className="border-t-2 border-line mt-4 pt-3">
              <p className="text-xs mono-brutal text-subtext uppercase">{providerCount} providers active</p>
            </div>
          </div>
        </div>

        {/* CHART + BASE URL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bar chart (2/3) */}
          <div className="lg:col-span-2 brutal-card p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="heading-brutal text-2xl text-ink">Requests Volume</h2>
                <p className="mono-brutal text-xs text-subtext uppercase">Last 7 days activity</p>
              </div>
              <div className="hidden sm:flex gap-2">
                <div className="flex items-center gap-2 px-3 py-1 border-2 border-line rounded-full text-xs font-bold">
                  <span className="w-3 h-3 bg-primary rounded-full border border-line" /> Incoming
                </div>
                <div className="flex items-center gap-2 px-3 py-1 border-2 border-line rounded-full text-xs font-bold">
                  <span className="w-3 h-3 bg-accent rounded-full border border-line" /> Cached
                </div>
              </div>
            </div>

            <div className="h-[240px] flex items-end gap-3 pb-4 border-b-2 border-line">
              {chartBars.map(([a, b], i) => (
                <div key={i} className="flex-1 flex flex-col justify-end gap-1">
                  <div
                    className="w-full bg-primary border-2 border-line transition-all hover:opacity-90"
                    style={{ height: `${a}%` }}
                  />
                  <div
                    className="w-full bg-accent border-2 border-line transition-all hover:opacity-90"
                    style={{ height: `${b}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 mono-brutal text-[10px] text-subtext uppercase">
              {chartDays.map(d => <span key={d}>{d}</span>)}
            </div>
          </div>

          {/* Base URL card (1/3) */}
          <div className="brutal-card p-6 flex flex-col">
            <h3 className="heading-brutal text-lg text-ink mb-2">Base URL</h3>
            <p className="mono-brutal text-xs text-subtext uppercase mb-4">Public gateway endpoint</p>
            <code className="mono-brutal block text-xs text-ink bg-canvas border-2 border-line rounded-lg px-4 py-3 truncate">
              {baseUrl}
            </code>
            <div className="mt-auto pt-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-success border-2 border-line rounded-full" />
                <span className="text-sm font-bold text-ink">Gateway online</span>
              </div>
              <p className="mono-brutal text-[10px] text-subtext mt-1 uppercase">All systems normal</p>
            </div>
          </div>
        </div>

        {/* QUICK LINKS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { label: 'ENDPOINT', path: '/admin/endpoint', desc: 'Gateway URL & keys', bg: 'var(--primary)' },
            { label: 'PROVIDERS', path: '/admin/providers', desc: 'Manage LLM providers', bg: 'var(--accent)' },
            { label: 'SETTINGS', path: '/admin/settings', desc: 'Global configuration', bg: 'var(--warning)' },
          ].map(c => (
            <a key={c.path} href={c.path} className="brutal-card p-5 block group">
              <div className="flex items-center justify-between">
                <div
                  className="w-9 h-9 border-2 border-line rounded flex items-center justify-center"
                  style={{ background: c.bg }}
                >
                  <svg className="w-4 h-4 text-ink" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M13 7l5 5-5 5M6 7l5 5-5 5" />
                  </svg>
                </div>
                <span className="mono-brutal text-[10px] text-subtext/70 uppercase group-hover:text-ink transition-colors">OPEN →</span>
              </div>
              <div className="heading-brutal text-base text-ink mt-4">{c.label}</div>
              <div className="text-xs font-semibold text-subtext mt-1">{c.desc}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
