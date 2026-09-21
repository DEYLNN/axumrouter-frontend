import { useEffect, useState } from 'react'
import { getLogs, getProviders, clearLogs as apiClearLogs, iconUrl } from '../api'
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
      await apiClearLogs()
      setPage(1)
      await load(1)
    } catch (e: any) {
      setError(e.message)
    }
    setClearing(false)
  }

  if (error) return (
    <div className="brutal-card p-6 text-center">
      <div className="text-[#ff6b5e] mono-brutal text-sm font-bold">ERROR: {error}</div>
    </div>
  )

  return (
    <div className="relative">
      <div className="space-y-5">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="heading-brutal text-3xl uppercase tracking-tight">LOGS</h1>
            <p className="text-lg font-medium text-gray-600">{total} entries</p>
          </div>
          <button onClick={clearLogs} disabled={clearing || total === 0}
            className="brutal-btn bg-[#ff6b5e] text-white px-4 py-2 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d={clearing ? 'M12 4v16m8-8H4' : 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'} />
            </svg>
            {clearing ? 'Clearing...' : 'Clear All'}
          </button>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-sm mono-brutal text-gray-500 animate-pulse">LOADING...</div>
            </div>
          ) : logs.length === 0 ? (
            <div className="brutal-card p-12 text-center">
              <div className="text-xs mono-brutal text-gray-500">No logs yet</div>
            </div>
          ) : (
            logs.map(l => {
              const isSuccess = l.status === 'success' || l.status === 'streaming'
              const meta = providerMeta[l.provider_id]
              const color = meta?.color || '#6366F1'
              const icon = meta?.icon_name ? iconUrl(meta.icon_name) : ''
              const displayName = meta?.display_name || l.provider_id
              const tokPerSec = l.latency_ms && l.latency_ms > 0 && l.total_tokens > 0
                ? (l.total_tokens / (l.latency_ms / 1000)).toFixed(0)
                : null

              return (
                <div key={l.id} className="brutal-card p-4">
                  {/* Row 1: icon + model full ID + status */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-[#111111]"
                        style={{ background: `${color}18` }}
                      >
                        {icon ? (
                          <img src={icon} alt="" className="w-4 h-4 object-contain" />
                        ) : (
                          <span className="text-[10px] font-bold mono-brutal" style={{ color }}>{l.provider_id.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <code className="text-xs mono-brutal font-bold text-[#111111] truncate">{l.model_id}</code>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`status-pill ${isSuccess ? 'bg-[#3ddc97] text-[#111111]' : 'bg-[#ff6b5e] text-white'}`}>
                        {isSuccess ? 'OK' : l.status_code ? String(l.status_code) : 'ERR'}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: provider display name + gateway key label + provider key label */}
                  <div className="flex items-center justify-between mb-3 ml-9 gap-2">
                    <span className="text-[10px] mono-brutal text-gray-500 truncate">{displayName}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {l.provider_key_label ? (
                        <span
                          className="text-[9px] mono-brutal text-[#ffd23f] font-bold truncate max-w-[120px]"
                          title={l.provider_key_label}
                        >
                          🔑 {l.provider_key_label}
                        </span>
                      ) : null}
                      {l.key_label ? (
                        <span
                          className="text-[9px] mono-brutal text-[#ff3d81] font-bold truncate max-w-[120px]"
                          title={l.api_key_id}
                        >
                          {l.key_label}
                        </span>
                      ) : l.api_key_id ? (
                        <span
                          className="text-[9px] mono-brutal text-gray-400 truncate max-w-[120px]"
                          title={l.api_key_id}
                        >
                          {l.api_key_id}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Row 3: stats */}
                  <div className="flex items-center gap-4 text-[10px] mono-brutal mb-3 text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="font-bold">{tokPerSec ? `${tokPerSec} tok/s` : '-'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                      </svg>
                      <span className="font-bold">{l.latency_ms != null ? `${l.latency_ms}ms` : '-'}</span>
                    </div>
                    <div className="ml-auto text-gray-400">{timeAgo(l.created_at)}</div>
                  </div>

                  {/* Row 4: token breakdown */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-[#f0f0f0] border-2 border-[#111111] p-2.5 text-center">
                      <div className="text-[8px] mono-brutal text-gray-500 uppercase tracking-wider font-bold">In</div>
                      <div className="text-[11px] mono-brutal font-bold text-[#111111] mt-0.5">{l.prompt_tokens}</div>
                    </div>
                    <div className="rounded-lg bg-[#f0f0f0] border-2 border-[#111111] p-2.5 text-center">
                      <div className="text-[8px] mono-brutal text-gray-500 uppercase tracking-wider font-bold">Out</div>
                      <div className="text-[11px] mono-brutal font-bold text-[#111111] mt-0.5">{l.completion_tokens}</div>
                    </div>
                    <div className="rounded-lg bg-[#f0f0f0] border-2 border-[#111111] p-2.5 text-center">
                      <div className="text-[8px] mono-brutal text-gray-500 uppercase tracking-wider font-bold">Total</div>
                      <div className="text-[11px] mono-brutal font-bold text-[#111111] mt-0.5">{l.total_tokens}</div>
                    </div>
                  </div>

                  {/* Error */}
                  {!isSuccess && l.error_message && (
                    <div className="rounded-lg bg-[#ff6b5e]/10 border-2 border-[#ff6b5e] p-3 mt-3">
                      <div className="text-[9px] mono-brutal text-[#ff6b5e] font-bold break-words leading-relaxed">
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
          <div className="flex items-center justify-center gap-2 sm:gap-3 pt-2 px-2 flex-nowrap">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="brutal-btn bg-white text-[#111111] px-3 py-1.5 text-xs font-bold disabled:opacity-30 shrink-0">← Prev</button>
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none justify-center">
              {(() => {
                const pages: number[] = []
                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i)
                } else {
                  pages.push(1)
                  const start = Math.max(2, page - 1)
                  const end = Math.min(totalPages - 1, page + 1)
                  if (start > 2) pages.push(-1)
                  for (let i = start; i <= end; i++) pages.push(i)
                  if (end < totalPages - 1) pages.push(-1)
                  pages.push(totalPages)
                }
                return pages.map((p, idx) =>
                  p === -1 ? (
                    <span key={`ellipsis-${idx}`} className="text-gray-400 px-0.5 shrink-0">…</span>
                  ) : (
                    <button key={p} onClick={() => setPage(p)}
                      className={`brutal-btn w-8 h-8 text-xs font-bold shrink-0 ${p === page ? 'bg-[#ff3d81] text-white' : 'bg-white text-[#111111]'}`}>{p}</button>
                  )
                )
              })()}
            </div>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="brutal-btn bg-white text-[#111111] px-3 py-1.5 text-xs font-bold disabled:opacity-30 shrink-0">Next →</button>
          </div>
        )}
      </div>
    </div>
  )
}
