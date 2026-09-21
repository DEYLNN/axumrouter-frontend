import { useEffect, useMemo, useState } from 'react'
import { getSettings } from '../api'
import { getProviders } from '../api/providers'
import type { SettingsData } from '../api'
import LineChart, { compact } from '../components/LineChart'
import { useLiveUsage, useNow, timeAgo, bucket, utcToday } from '../hooks/useLiveUsage'

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

/** Rolling clock label for the "last hour" window. */
function windowLabels(count: number, minutes: number): string[] {
  const out: string[] = []
  for (let i = count - 1; i >= 0; i -= Math.max(1, Math.floor(count / 4))) {
    const minsAgo = i * minutes
    out.push(minsAgo === 0 ? 'now' : `-${minsAgo}m`)
  }
  return out
}

export default function Dashboard() {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [providerCount, setProviderCount] = useState(0)

  const { events, totals, ready, connected } = useLiveUsage(200)
  const now = useNow(1000)

  useEffect(() => {
    getSettings().then(s => setSettings(s)).catch(() => {})
    getProviders().then(p => setProviderCount(p.length)).catch(() => {})
  }, [])

  const today = utcToday()
  const todayEvents = useMemo(() => events.filter(e => e.created_at.startsWith(today)), [events, today])

  const todayRequests = useMemo(() => {
    // seeded window may be shorter than a day — show the larger of the two
    return Math.max(todayEvents.length, 0)
  }, [todayEvents])

  const todayTokens = useMemo(
    () => todayEvents.reduce((s, e) => s + (e.total_tokens || 0), 0),
    [todayEvents],
  )

  const successCount = useMemo(
    () => events.filter(e => e.status === 'success' || e.status === 'streaming').length,
    [events],
  )
  const errorCount = useMemo(() => events.filter(e => e.status === 'error').length, [events])

  const lastRequestAgo = events.length > 0 ? timeAgo(events[0].created_at, now) : '—'

  /* Charts — 30 one-minute buckets = last 30 minutes */
  const BUCKETS = 30
  const requestSeries = useMemo(() => bucket(events, () => 1, now, BUCKETS, 1), [events, now])
  const promptSeries = useMemo(() => bucket(events, e => e.prompt_tokens || 0, now, BUCKETS, 1), [events, now])
  const completionSeries = useMemo(() => bucket(events, e => e.completion_tokens || 0, now, BUCKETS, 1), [events, now])

  const reqLabels = windowLabels(BUCKETS, 1)
  const tokenLabels = reqLabels

  const baseUrl = settings?.public_url || import.meta.env.VITE_GATEWAY_BACKEND_URL || '—'
  const fmt = (n: number) => n.toLocaleString('en-US')

  return (
    <div className="relative">
      <div className="space-y-8">
        {/* Header */}
        <div className="mb-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="heading-brutal text-3xl text-ink">Dashboard</h1>
            <p className="mono-brutal text-xs text-subtext mt-1 uppercase">System overview & statistics</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <span
              className={`w-2.5 h-2.5 rounded-full border-2 border-line ${connected ? 'bg-success' : 'bg-danger'}`}
            />
            <span className="mono-brutal text-[10px] uppercase text-subtext">
              {connected ? 'live' : ready ? 'reconnecting' : 'connecting'}
            </span>
          </div>
        </div>

        {/* STAT CARDS — 3 columns, live */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 — Requests */}
          <div className="brutal-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <StatIcon name="requests" />
              <p className="mono-brutal text-xs text-subtext uppercase">Requests</p>
            </div>
            <p className="text-3xl font-black heading-brutal text-ink">{fmt(totals.requests)}</p>
            <div className="border-t-2 border-line mt-4 pt-3">
              <p className="text-xs mono-brutal text-subtext uppercase">
                Today: {fmt(todayRequests)} requests
              </p>
            </div>
          </div>

          {/* Card 2 — Total Tokens */}
          <div className="brutal-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <StatIcon name="tokens" />
              <p className="mono-brutal text-xs text-subtext uppercase">Total Tokens</p>
            </div>
            <p className="text-3xl font-black heading-brutal text-ink">{compact(totals.tokens)}</p>
            <div className="border-t-2 border-line mt-4 pt-3">
              <p className="text-xs mono-brutal text-subtext uppercase">
                Today: {compact(todayTokens)} tokens
              </p>
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

        {/* CHARTS — requests (2/3) + tokens & status (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Requests line chart */}
          <div className="lg:col-span-2 brutal-card p-6 sm:p-8">
            <div className="flex items-start justify-between mb-5 gap-4">
              <div>
                <h2 className="heading-brutal text-2xl text-ink">Requests Volume</h2>
                <p className="mono-brutal text-xs text-subtext uppercase">Last 30 minutes · live</p>
              </div>
              <div className="text-right shrink-0">
                <p className="mono-brutal text-2xl font-black text-ink">
                  {fmt(requestSeries.reduce((a, b) => a + b, 0))}
                </p>
                <p className="mono-brutal text-[10px] uppercase text-subtext">in window</p>
              </div>
            </div>

            <LineChart
              series={[{ values: requestSeries, color: 'var(--primary)', label: 'Requests' }]}
              height={240}
              legendFmt={n => n.toLocaleString('en-US')}
              xLabels={reqLabels}
            />
          </div>

          {/* Tokens line chart + success/error */}
          <div className="brutal-card p-6 flex flex-col">
            <div className="mb-5">
              <h2 className="heading-brutal text-xl text-ink">Token Flow</h2>
              <p className="mono-brutal text-xs text-subtext uppercase">Last 30 minutes · live</p>
            </div>

            <LineChart
              series={[
                { values: promptSeries, color: 'var(--primary)', label: 'In' },
                { values: completionSeries, color: 'var(--success)', label: 'Out' },
              ]}
              height={170}
              xLabels={tokenLabels}
            />

            {/* success / error counts */}
            <div className="border-t-2 border-line mt-5 pt-4 grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full border border-line bg-success" />
                  <span className="mono-brutal text-[10px] uppercase text-subtext">Success</span>
                </div>
                <p className="mono-brutal text-lg font-black text-success-text">{fmt(successCount)}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full border border-line bg-danger" />
                  <span className="mono-brutal text-[10px] uppercase text-subtext">Error</span>
                </div>
                <p className="mono-brutal text-lg font-black text-danger-text">{fmt(errorCount)}</p>
              </div>
            </div>

            <div className="mt-auto pt-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-success border-2 border-line rounded-full" />
                <span className="text-sm font-bold text-ink">Gateway online</span>
              </div>
              <p className="mono-brutal text-[10px] text-subtext mt-1 uppercase truncate">{baseUrl}</p>
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
                  <svg className="w-4 h-4 text-on-accent" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
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
