import { useCallback, useEffect, useRef, useState } from 'react'
import { API_BASE, apiFetch, getToken } from '../api/client'

/** One usage row — matches backend `UsageLogRow`. */
export interface UsageEvent {
  id: string
  created_at: string
  provider_id: string | null
  model_id: string | null
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  latency_ms: number
  status: string | null
  status_code: number | null
}

export interface LiveTotals {
  requests: number
  tokens: number
}

/** All-time rollup per provider — `/usage/by-provider`. */
export interface ProviderStat {
  provider_id: string
  requests: number
  success: number
  errors: number
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  avg_latency_ms: number
}

/** All-time rollup per model — `/usage/by-model`. */
export interface ModelStat {
  model_id: string
  provider_id: string
  requests: number
  success: number
  errors: number
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  avg_latency_ms: number
}

/** Today's (UTC) rollup — `/usage/today`. */
export interface TodayStat {
  requests: number
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

/** All-time latency percentiles — `/usage/latency`. */
export interface LatencyStat {
  samples: number
  avg_ms: number
  p95_ms: number
  min_ms: number
  max_ms: number
}

/** Aggregates are only refetched at most this often (SSE can fire rapidly). */
const AGG_MIN_INTERVAL_MS = 5000

/** Hard cap on rows kept in memory (charts only need the recent window). */
const MAX_EVENTS = 3000
/** Backend clamps `/logs?limit=` to 200 per page. */
const PAGE_SIZE = 200
/** Stop paginating once we're past this many minutes back. */
const SEED_WINDOW_MIN = 15
/** Safety net so a runaway loop can't hammer the API. */
const MAX_PAGES = 25

/** Parse a DB timestamp (UTC, "YYYY-MM-DD HH:MM:SS") into epoch ms. */
export function parseUtc(dt: string): number {
  return Date.parse(dt.replace(' ', 'T') + 'Z')
}

/** Today's date as UTC `YYYY-MM-DD` — matches how the DB stores timestamps. */
export function utcToday(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Page backwards through `/logs` until rows fall outside the seed window.
 * The backend clamps each page to 200 rows, so this is the only way to get
 * a complete picture when traffic runs into the thousands per window.
 */
async function fetchWindow(minutes: number): Promise<UsageEvent[]> {
  const cutoff = Date.now() - minutes * 60_000
  const all: UsageEvent[] = []
  const seenIds = new Set<string>()

  for (let page = 1; page <= MAX_PAGES; page++) {
    let data: { logs?: UsageEvent[] } = {}
    try {
      const res = await apiFetch(`/logs?limit=${PAGE_SIZE}&page=${page}`)
      data = await res.json()
    } catch {
      break
    }
    const rows = data.logs || []
    if (rows.length === 0) break

    for (const r of rows) {
      if (seenIds.has(r.id)) continue
      seenIds.add(r.id)
      all.push(r)
    }

    // stop once the oldest row on this page predates the window
    const oldest = rows[rows.length - 1]
    if (parseUtc(oldest.created_at) < cutoff) break
    if (rows.length < PAGE_SIZE) break
  }

  return all
}

/**
 * Live usage feed.
 * Seeds from `/usage/stats` + a paginated `/logs` scan covering the recent
 * window, then subscribes to the backend SSE stream so counters and charts
 * update the moment a request lands.
 */
export function useLiveUsage(windowMinutes = SEED_WINDOW_MIN) {
  const [events, setEvents] = useState<UsageEvent[]>([])
  const [totals, setTotals] = useState<LiveTotals>({ requests: 0, tokens: 0 })
  const [ready, setReady] = useState(false)
  const [connected, setConnected] = useState(false)

  /* All-time aggregates (not derived from the 15-min event window) */
  const [providers, setProviders] = useState<ProviderStat[]>([])
  const [models, setModels] = useState<ModelStat[]>([])
  const [today, setToday] = useState<TodayStat | null>(null)
  const [latency, setLatency] = useState<LatencyStat | null>(null)

  const seen = useRef<Set<string>>(new Set())
  const alive = useRef(true)
  const lastAgg = useRef(0)

  /** Pull all four all-time rollups in one go. */
  const loadAggregates = useCallback(async () => {
    lastAgg.current = Date.now()
    const get = (path: string) =>
      apiFetch(path)
        .then(r => r.json())
        .catch(() => null)
    const [p, m, t, l] = await Promise.all([
      get('/usage/by-provider'),
      get('/usage/by-model'),
      get('/usage/today'),
      get('/usage/latency'),
    ])
    if (p) setProviders(p)
    if (m) setModels(m)
    if (t) setToday(t)
    if (l) setLatency(l)
  }, [])

  /* 1 — initial seed */
  useEffect(() => {
    let cancelled = false
    Promise.all([
      apiFetch('/usage/stats').then(r => r.json()).catch(() => ({})),
      fetchWindow(windowMinutes),
    ]).then(([stats, rows]) => {
      if (cancelled) return
      rows.forEach(r => seen.current.add(r.id))
      setEvents(rows.slice(0, MAX_EVENTS))
      setTotals({
        requests: stats?.total_requests || 0,
        tokens:
          stats?.total_tokens ||
          (stats?.total_prompt_tokens || 0) + (stats?.total_completion_tokens || 0),
      })
      setReady(true)
    })
    loadAggregates()
    return () => {
      cancelled = true
    }
  }, [windowMinutes, loadAggregates])

  /* 2 — SSE subscription */
  useEffect(() => {
    if (!ready) return
    alive.current = true
    const ctrl = new AbortController()
    let retry: ReturnType<typeof setTimeout> | undefined

    const connect = async () => {
      if (!alive.current) return
      try {
        const token = getToken()
        const res = await fetch(`${API_BASE}/usage/stream`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: ctrl.signal,
        })
        if (!res.ok || !res.body) throw new Error(`stream ${res.status}`)

        setConnected(true)
        const reader = res.body.getReader()
        const dec = new TextDecoder()
        let buf = ''

        while (alive.current) {
          const { done, value } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })

          // SSE frames are separated by a blank line
          let cut: number
          while ((cut = buf.search(/\r?\n\r?\n/)) !== -1) {
            const frame = buf.slice(0, cut)
            buf = buf.slice(cut).replace(/^\r?\n\r?\n/, '')

            const dataLine = frame.split(/\r?\n/).find(l => l.startsWith('data:'))
            if (!dataLine) continue

            try {
              const ev = JSON.parse(dataLine.slice(5).trim()) as UsageEvent
              if (!ev?.id || seen.current.has(ev.id)) continue
              seen.current.add(ev.id)
              setEvents(prev => [ev, ...prev].slice(0, MAX_EVENTS))
              setTotals(t => ({
                requests: t.requests + 1,
                tokens: t.tokens + (ev.total_tokens || 0),
              }))
              // keep the all-time rollups fresh without hammering the API
              if (Date.now() - lastAgg.current > AGG_MIN_INTERVAL_MS) {
                loadAggregates()
              }
            } catch {
              /* malformed frame — skip */
            }
          }
        }
      } catch {
        /* network/abort — retried below unless unmounted */
      } finally {
        if (alive.current) {
          setConnected(false)
          retry = setTimeout(connect, 2000)
        }
      }
    }

    connect()
    return () => {
      alive.current = false
      if (retry) clearTimeout(retry)
      ctrl.abort()
    }
  }, [ready, loadAggregates])

  return { events, totals, ready, connected, providers, models, today, latency, refresh: loadAggregates }
}

/** Ticking clock for "x ago" labels — re-renders once per second. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/** "1s ago" / "5m ago" / "2h ago" / "3d ago" — DB timestamps are UTC. */
export function timeAgo(dt: string, now = Date.now()): string {
  const t = parseUtc(dt)
  if (Number.isNaN(t)) return '—'
  const diff = Math.floor((now - t) / 1000)
  if (diff < 0) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

/** Bucket events into `count` rolling windows of `minutes` each. */
export function bucket(
  events: UsageEvent[],
  valueOf: (e: UsageEvent) => number,
  now: number,
  count = 30,
  minutes = 1,
): number[] {
  const out = new Array<number>(count).fill(0)
  const size = minutes * 60_000
  const nowSlot = Math.floor(now / size)
  for (const e of events) {
    const t = parseUtc(e.created_at)
    if (Number.isNaN(t)) continue
    const idx = count - 1 - (nowSlot - Math.floor(t / size))
    if (idx >= 0 && idx < count) out[idx] += valueOf(e)
  }
  return out
}
