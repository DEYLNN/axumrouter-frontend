import { useEffect, useMemo, useState } from 'react'
import { getSettings } from '../api'
import { getProviders } from '../api/providers'
import type { SettingsData } from '../api'
import { iconUrl } from '../api/client'
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
  const [providers, setProviders] = useState<Record<string, { name: string; icon: string; color: string }>>({})

  const { events, totals, ready, connected } = useLiveUsage(200)
  const now = useNow(1000)

  useEffect(() => {
    getSettings().then(s => setSettings(s)).catch(() => {})
    getProviders().then(p => {
      setProviderCount(p.length)
      const map: Record<string, { name: string; icon: string; color: string }> = {}
      for (const prov of p) {
        map[prov.id] = {
          name: prov.display_name || prov.name || prov.id,
          icon: prov.icon_name ? iconUrl(prov.icon_name) : '',
          color: prov.color || 'var(--primary)',
        }
      }
      setProviders(map)
    }).catch(() => {})
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

  /* Top providers by request count (with success/error split) */
  const topProviders = useMemo(() => {
    const m = new Map<string, { count: number; ok: number; err: number }>()
    for (const e of events) {
      const p = e.provider_id || 'unknown'
      const cur = m.get(p) || { count: 0, ok: 0, err: 0 }
      cur.count++
      if (e.status === 'error') cur.err++
      else cur.ok++
      m.set(p, cur)
    }
    return [...m.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [events])

  /* Top models by request count */
  const topModels = useMemo(() => {
    const m = new Map<string, { count: number; tokens: number }>()
    for (const e of events) {
      const id = e.model_id || 'unknown'
      const cur = m.get(id) || { count: 0, tokens: 0 }
      cur.count++
      cur.tokens += e.total_tokens || 0
      m.set(id, cur)
    }
    return [...m.entries()]
      .map(([id, v]) => {
        // model ids are usually "provider/model" — split off the provider prefix
        const slash = id.indexOf('/')
        const pid = slash > 0 ? id.slice(0, slash) : ''
        const bare = slash > 0 ? id.slice(slash + 1) : id
        return { id, pid, bare, ...v }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [events])

  /* Latency stats */
  const latencyStats = useMemo(() => {
    const lats = events.map(e => e.latency_ms).filter(l => l > 0).sort((a, b) => a - b)
    if (lats.length === 0) return { avg: 0, p95: 0, min: 0, max: 0, count: 0 }
    const sum = lats.reduce((a, b) => a + b, 0)
    const p95Idx = Math.min(lats.length - 1, Math.floor(lats.length * 0.95))
    return {
      avg: Math.round(sum / lats.length),
      p95: lats[p95Idx],
      min: lats[0],
      max: lats[lats.length - 1],
      count: lats.length,
    }
  }, [events])

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

        {/* INSIGHTS — top providers / top models / latency */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Providers */}
          <div className="brutal-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-brutal text-lg text-ink">Top Providers</h2>
              <span className="mono-brutal text-[10px] uppercase text-subtext">by requests</span>
            </div>
            {topProviders.length === 0 ? (
              <p className="mono-brutal text-xs text-subtext">No traffic yet</p>
            ) : (
              <div className="space-y-3">
                {topProviders.map(p => {
                  const max = topProviders[0].count || 1
                  const total = p.count || 1
                  const okPct = (p.ok / max) * 100
                  const errPct = (p.err / max) * 100
                  const pInfo = providers[p.id]
                  return (
                    <div key={p.id}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          {pInfo?.icon ? (
                            <img src={pInfo.icon} alt="" className="w-4 h-4 rounded-sm object-contain shrink-0" />
                          ) : (
                            <span
                              className="w-4 h-4 rounded-sm border border-line shrink-0"
                              style={{ background: pInfo?.color || 'var(--muted)' }}
                            />
                          )}
                          <span className="mono-brutal text-xs font-bold text-ink truncate">
                            {pInfo?.name || p.id}
                          </span>
                        </div>
                        <span className="mono-brutal text-[10px] text-subtext shrink-0 tabular-nums flex items-center gap-1.5">
                          {fmt(p.count)}
                          {p.err > 0 && (
                            <span className="text-danger-text border border-danger-text rounded px-1 py-px leading-none">
                              {Math.round((p.err / total) * 100)}%
                            </span>
                          )}
                        </span>
                      </div>
                      {/* stacked success/error bar */}
                      <div className="flex h-2.5 border-2 border-line rounded-sm overflow-hidden bg-canvas">
                        <div className="h-full bg-success" style={{ width: `${okPct}%` }} />
                        <div className="h-full bg-danger" style={{ width: `${errPct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Top Models */}
          <div className="brutal-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-brutal text-lg text-ink">Top Models</h2>
              <span className="mono-brutal text-[10px] uppercase text-subtext">req · tok</span>
            </div>
            {topModels.length === 0 ? (
              <p className="mono-brutal text-xs text-subtext">No traffic yet</p>
            ) : (
              <div className="space-y-2.5">
                {topModels.map(m => {
                  const pInfo = providers[m.pid]
                  return (
                    <div key={m.id} className="flex items-center gap-2">
                      {/* provider icon instead of the id prefix */}
                      <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        {pInfo?.icon ? (
                          <img src={pInfo.icon} alt="" className="w-5 h-5 rounded-sm object-contain" />
                        ) : (
                          <span
                            className="w-4 h-4 rounded-sm border border-line"
                            style={{ background: pInfo?.color || 'var(--muted)' }}
                          />
                        )}
                      </div>
                      <span className="mono-brutal text-xs font-bold text-ink truncate flex-1 min-w-0" title={m.id}>
                        {m.bare}
                      </span>
                      {/* fixed-width columns so req/tok never wrap or misalign */}
                      <span className="mono-brutal text-[10px] text-subtext tabular-nums w-12 text-right shrink-0">
                        {fmt(m.count)}
                      </span>
                      <span className="mono-brutal text-[10px] text-subtext tabular-nums w-14 text-right shrink-0">
                        {compact(m.tokens)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Latency */}
          <div className="brutal-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-brutal text-lg text-ink">Latency</h2>
              <span className="mono-brutal text-[10px] uppercase text-subtext">{fmt(latencyStats.count)} samples</span>
            </div>
            {latencyStats.count === 0 ? (
              <p className="mono-brutal text-xs text-subtext">No samples yet</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="mono-brutal text-[10px] uppercase text-subtext mb-1">Average</p>
                    <p className="mono-brutal text-2xl font-black text-ink">
                      {fmt(latencyStats.avg)}
                      <span className="text-xs font-normal text-subtext ml-1">ms</span>
                    </p>
                  </div>
                  <div>
                    <p className="mono-brutal text-[10px] uppercase text-subtext mb-1">p95</p>
                    <p className="mono-brutal text-2xl font-black text-primary-text">
                      {fmt(latencyStats.p95)}
                      <span className="text-xs font-normal text-subtext ml-1">ms</span>
                    </p>
                  </div>
                </div>
                <div className="border-t-2 border-line mt-4 pt-3 flex items-center justify-between">
                  <span className="mono-brutal text-[10px] uppercase text-subtext">Range</span>
                  <span className="mono-brutal text-[10px] text-subtext tabular-nums">
                    {fmt(latencyStats.min)}–{fmt(latencyStats.max)} ms
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
