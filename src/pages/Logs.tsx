import { useEffect, useState } from 'react'
import { getLogs, getProviders } from '../api'
import type { LogEntry, ProviderMeta } from '../api'

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const d = new Date(dateStr.replace(' ', 'T') + 'Z')
  const diff = Math.floor((now - d.getTime()) / 1000)
  if (diff < 5) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clearing, setClearing] = useState(false)
  const [providerMeta, setProviderMeta] = useState<Record<string, ProviderMeta>>({})

  const load = (p: number) => {
    setLoading(true)
    Promise.all([
      getLogs(p, 20),
      p === 1 ? getProviders() : Promise.resolve([] as ProviderMeta[]),
    ]).then(([r, providers]) => {
      setLogs(r.logs)
      setTotal(r.total)
      setPage(r.page)
      setTotalPages(r.total_pages)
      if (providers.length) {
        const m: Record<string, ProviderMeta> = {}
        providers.forEach(p => { m[p.id] = p })
        setProviderMeta(m)
      }
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(page) }, [page])

  const clearLogs = async () => {
    if (!confirm('Delete ALL logs? This cannot be undone.')) return
    setClearing(true)
    try {
      await fetch('/admin/api/logs/clear', { method: 'POST' })
      setPage(1)
      await load(1)
    } catch (e: any) {
      setError(e.message)
    }
    setClearing(false)
  }

  if (error) return (
    <div className="border border-red-900/50 rounded-xl p-6 text-center bg-red-950/10">
      <div className="text-red-400 font-mono text-xs">ERROR: {error}</div>
    </div>
  )

  return (
    <div className="relative">
      <div className="space-y-5">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent"
              style={{ textShadow: '0 0 30px rgba(6,182,212,0.3)' }}>
              LOGS
            </h1>
            <p className="text-[10px] font-mono text-slate-500 mt-0.5">{total} entries</p>
          </div>
          <button onClick={clearLogs} disabled={clearing || total === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-semibold text-red-400/80 bg-red-500/8 border border-red-500/20 hover:bg-red-500/15 hover:text-red-300 hover:border-red-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={total > 0 ? { boxShadow: '0 0 8px rgba(239,68,68,0.1)' } : {}}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d={clearing ? 'M12 4v16m8-8H4' : 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'} />
          </svg>
          {clearing ? 'Clearing...' : 'Clear All'}
        </button>
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-xs font-mono text-slate-500 animate-pulse">LOADING...</div>
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-xl bg-[#0a0f1e]/60 border border-white/[0.06] p-12 text-center">
              <div className="text-xs font-mono text-slate-600">No logs yet</div>
            </div>
          ) : (
            logs.map(l => {
              const isSuccess = l.status === 'success' || l.status === 'streaming'
              const meta = providerMeta[l.provider_id]
              const color = meta?.color || '#6366F1'
              const icon = meta?.icon_url || ''
              const displayName = meta?.display_name || l.provider_id
              const tokPerSec = l.latency_ms && l.latency_ms > 0 && l.total_tokens > 0
                ? (l.total_tokens / (l.latency_ms / 1000)).toFixed(0)
                : null

              return (
                <div key={l.id}
                  className="rounded-xl border border-white/[0.06] bg-[#0a0f1e]/60 hover:border-cyan-500/30 transition-all p-4"
                  style={{
                    boxShadow: isSuccess
                      ? `inset 0 1px 0 rgba(6,182,212,0.06), 0 0 20px rgba(6,182,212,0.03)`
                      : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = `${color}40`
                    e.currentTarget.style.boxShadow = `inset 0 0 20px ${color}05, 0 0 12px ${color}10`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                    e.currentTarget.style.boxShadow = isSuccess
                      ? 'inset 0 1px 0 rgba(6,182,212,0.06), 0 0 20px rgba(6,182,212,0.03)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.03)'
                  }}
                >
                  {/* Row 1: icon + model full ID + status */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border"
                        style={{ background: `${color}12`, borderColor: `${color}25`, boxShadow: `0 0 6px ${color}10` }}
                      >
                        {icon ? (
                          <img src={icon} alt="" className="w-4 h-4 object-contain" />
                        ) : (
                          <span className="text-[10px] font-bold font-mono" style={{ color }}>{l.provider_id.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <code className="text-xs font-mono text-slate-300 truncate">{l.model_id}</code>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className={`w-2 h-2 rounded-full ${isSuccess ? 'bg-emerald-500' : 'bg-red-500'}`}
                        style={isSuccess ? { boxShadow: '0 0 6px rgba(52,211,153,0.5)' } : {}} />
                      <span className={`text-[9px] font-mono font-semibold ${isSuccess ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isSuccess ? 'OK' : l.status_code ? String(l.status_code) : 'ERR'}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: provider display name + key label */}
                  <div className="flex items-center justify-between mb-3 ml-9">
                    <span className="text-[10px] font-mono text-slate-500">{displayName}</span>
                    {l.key_label ? (
                      <span className="text-[9px] font-mono text-cyan-400/80 truncate max-w-[140px]" title={l.api_key_id}>{l.key_label}</span>
                    ) : l.api_key_id ? (
                      <span className="text-[9px] font-mono text-slate-600 truncate max-w-[120px]" title={l.api_key_id}>{l.api_key_id}</span>
                    ) : null}
                  </div>

                  {/* Row 3: stats */}
                  <div className="flex items-center gap-4 text-[10px] font-mono mb-3">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>{tokPerSec ? `${tokPerSec} tok/s` : '-'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                      </svg>
                      <span>{l.latency_ms != null ? `${l.latency_ms}ms` : '-'}</span>
                    </div>
                    <div className="ml-auto text-slate-600">{timeAgo(l.created_at)}</div>
                  </div>

                  {/* Row 4: token breakdown */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-black/40 border border-white/[0.06] p-2.5 text-center">
                      <div className="text-[8px] font-mono text-slate-600 uppercase tracking-wider">In</div>
                      <div className="text-[11px] font-mono font-semibold text-slate-300 mt-0.5">{l.prompt_tokens}</div>
                    </div>
                    <div className="rounded-lg bg-black/40 border border-white/[0.06] p-2.5 text-center">
                      <div className="text-[8px] font-mono text-slate-600 uppercase tracking-wider">Out</div>
                      <div className="text-[11px] font-mono font-semibold text-slate-300 mt-0.5">{l.completion_tokens}</div>
                    </div>
                    <div className="rounded-lg bg-black/40 border border-white/[0.06] p-2.5 text-center">
                      <div className="text-[8px] font-mono text-slate-600 uppercase tracking-wider">Total</div>
                      <div className="text-[11px] font-mono font-semibold text-slate-300 mt-0.5">{l.total_tokens}</div>
                    </div>
                  </div>

                  {/* Error */}
                  {!isSuccess && l.error_message && (
                    <div className="rounded-lg bg-red-950/15 border border-red-900/25 p-3 mt-3">
                      <div className="text-[9px] font-mono text-red-400/80 break-words leading-relaxed">
                        {l.status_code && <span className="font-bold">[{l.status_code}] </span>}
                        {l.error_message}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all disabled:opacity-30">← Prev</button>
            <div className="flex items-center gap-1.5">
              {(() => {
                const pages: number[] = []
                const maxVisible = 7
                if (totalPages <= maxVisible) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i)
                } else {
                  pages.push(1)
                  const start = Math.max(2, page - 2)
                  const end = Math.min(totalPages - 1, page + 2)
                  if (start > 2) pages.push(-1)
                  for (let i = start; i <= end; i++) pages.push(i)
                  if (end < totalPages - 1) pages.push(-1)
                  pages.push(totalPages)
                }
                return pages.map((p, idx) =>
                  p === -1 ? (
                    <span key={`ellipsis-${idx}`} className="text-slate-600 px-1">…</span>
                  ) : (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-7 h-7 rounded-lg text-[10px] font-mono transition-all ${p === page ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-600 hover:text-slate-400 hover:bg-white/[0.04]'}`}>{p}</button>
                  )
                )
              })()}
            </div>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all disabled:opacity-30">Next →</button>
          </div>
        )}
      </div>
    </div>
  )
}
