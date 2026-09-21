import { useEffect, useRef, useState } from 'react'
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

const MAX_EVENTS = 500

/** Parse a DB timestamp (UTC, "YYYY-MM-DD HH:MM:SS") into epoch ms. */
export function parseUtc(dt: string): number {
  return Date.parse(dt.replace(' ', 'T') + 'Z')
}

/** Today's date as UTC `YYYY-MM-DD` — matches how the DB stores timestamps. */
export function utcToday(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Live usage feed.
 * Seeds from `/usage/stats` + `/logs` once, then subscribes to the backend
 * SSE stream so counters and charts update the moment a request lands.
 */
export function useLiveUsage(seedLimit = 200) {
  const [events, setEvents] = useState<UsageEvent[]>([])
  const [totals, setTotals] = useState<LiveTotals>({ requests: 0, tokens: 0 })
  const [ready, setReady] = useState(false)
  const [connected, setConnected] = useState(false)

  const seen = useRef<Set<string>>(new Set())
  const alive = useRef(true)

  /* 1 — initial seed */
  useEffect(() => {
    let cancelled = false
    Promise.all([
      apiFetch('/usage/stats').then(r => r.json()).catch(() => ({})),
      apiFetch(`/logs?limit=${seedLimit}`).then(r => r.json()).catch(() => ({})),
    ]).then(([stats, logs]) => {
      if (cancelled) return
      const rows: UsageEvent[] = logs?.logs || []
      rows.forEach(r => seen.current.add(r.id))
      setEvents(rows)
      setTotals({
        requests: stats?.total_requests || 0,
        tokens:
          stats?.total_tokens ||
          (stats?.total_prompt_tokens || 0) + (stats?.total_completion_tokens || 0),
      })
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [seedLimit])

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
  }, [ready])

  return { events, totals, ready, connected }
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
