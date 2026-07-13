import { useEffect, useState } from 'react'
import { getLogs } from '../api'
import { apiFetch } from '../api'
import type { LogEntry } from '../api'

interface UsageStats {
  total_requests: number
  total_prompt_tokens: number
  total_completion_tokens: number
  total_tokens: number
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const d = new Date(dateStr.replace(' ', 'T') + 'Z')
  const diff = Math.floor((now - d.getTime()) / 1000)
  if (diff < 2) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1e]/60 p-4 transition-all hover:border-white/[0.12]"
      style={{ boxShadow: `inset 0 1px 0 ${color}15, 0 0 20px ${color}05` }}>
      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-xl font-bold font-mono" style={{ color }}>{value}</div>
    </div>
  )
}

function fmt(n: number) {
  if (n >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(1) + 'T'
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

interface UsageStats {
  total_requests: number
  total_prompt_tokens: number
  total_completion_tokens: number
  total_tokens: number
}

interface KeyUsage {
  gateway_key_id: string
  label: string | null
  key_value: string
  requests: number
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export default function Usage() {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [keyStats, setKeyStats] = useState<KeyUsage[]>([])

  useEffect(() => {
    // Initial load: stats + keyStats + logs (all once)
    getLogs(1, 50).then(r => { setLogs(r.logs); setTotal(r.total) }).catch(() => {})
    apiFetch('/usage/stats').then(r => r.json()).then(setStats).catch(() => {})
    apiFetch('/usage/stats/keys').then(r => r.json()).then(setKeyStats).catch(() => {})
  }, [])

  // Smooth real-time polling — only logs, not stats/keyStats
  useEffect(() => {
    const poll = () => {
      getLogs(1, 50).then(r => {
        setLogs(prev => {
          // Only update if there are actually new entries
          if (r.logs.length > 0 && r.logs[0].id !== prev[0]?.id) return r.logs
          return prev
        })
        setTotal(r.total)
      }).catch(() => {})
    }
    const id = setInterval(poll, 3000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent"
            style={{ textShadow: '0 0 30px rgba(6,182,212,0.3)' }}>
            USAGE
          </h1>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5">{total} total requests · live</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Total Requests" value={stats ? fmt(stats.total_requests) : '-'} color="#94A3B8" />
        <Card label="Input Tokens" value={stats ? fmt(stats.total_prompt_tokens) : '-'} color="#38BDF8" />
        <Card label="Output Tokens" value={stats ? fmt(stats.total_completion_tokens) : '-'} color="#22D3EE" />
        <Card label="Total Tokens" value={stats ? fmt(stats.total_tokens) : '-'} color="#A78BFA" />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Per Key</h2>
        {keyStats.length > 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1e]/60 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.04] text-[9px] font-mono text-slate-600 uppercase tracking-wider">
                  <th className="px-4 py-3">Key</th>
                  <th className="px-4 py-3 text-right">Requests</th>
                  <th className="px-4 py-3 text-right">IN</th>
                  <th className="px-4 py-3 text-right">OUT</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {keyStats.map(k => (
                  <tr key={k.gateway_key_id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-all">
                    <td className="px-4 py-3">
                      <div className="text-[11px] font-mono font-semibold text-slate-200">{k.label || 'unnamed'}</div>
                      <code className="text-[9px] font-mono text-slate-500">{k.key_value}...</code>
                    </td>
                    <td className="px-4 py-3 text-right text-[10px] font-mono text-slate-300">{k.requests}</td>
                    <td className="px-4 py-3 text-right text-[10px] font-mono text-sky-400">{fmt(k.prompt_tokens)}</td>
                    <td className="px-4 py-3 text-right text-[10px] font-mono text-cyan-400">{fmt(k.completion_tokens)}</td>
                    <td className="px-4 py-3 text-right text-[10px] font-mono text-purple-400">{fmt(k.total_tokens)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/[0.08] py-8 text-center text-[10px] font-mono text-slate-600">
          No per-key data yet. Make a request through any gateway key.
        </div>
      )}

      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">
          Recent Requests
          <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ boxShadow: '0 0 4px rgba(52,211,153,0.5)' }} />
        </h2>

        <div className="rounded-xl border border-white/[0.06] overflow-hidden">
          <div className="bg-[#0a0f1e]/80 px-4 py-2 border-b border-white/[0.06]">
            <div className="grid grid-cols-[1fr_auto_auto] gap-4 text-[10px] font-mono text-slate-600 uppercase tracking-wider">
              <span>Model</span>
              <span className="text-right">In / Out</span>
              <span className="text-right w-16">When</span>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
            {logs.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-xs font-mono text-slate-600">No requests yet</div>
              </div>
            ) : (
              logs.map((l, i) => {
                const ok = l.status === 'success' || l.status === 'streaming'
                return (
                  <div key={l.id}
                    className={`px-4 py-2.5 border-b border-white/[0.04] transition-all hover:bg-[#0a0f1e]/80 ${i === 0 ? '' : ''}`}>
                    <div className="grid grid-cols-[1fr_auto_auto] gap-4 items-center">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ok ? 'bg-emerald-500' : 'bg-red-500'}`}
                          style={ok ? { boxShadow: '0 0 4px rgba(52,211,153,0.5)' } : {}} />
                        <code className="text-xs font-mono text-slate-300 truncate">{l.model_id}</code>
                      </div>
                      <div className="text-right whitespace-nowrap font-mono text-xs">
                        <span className="text-cyan-400">{fmt(l.prompt_tokens)}↑</span>
                        {' '}
                        <span className="text-teal-400">{fmt(l.completion_tokens)}↓</span>
                      </div>
                      <div className="text-right w-16 font-mono text-[10px] text-slate-500">
                        {timeAgo(l.created_at)}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
