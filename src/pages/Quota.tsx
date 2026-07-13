import { useEffect, useState } from 'react'

import { apiFetch } from '../api'
import type { OAuthKey, QuotaData, ProviderMeta } from '../api'

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

function pct(used: number, total: number) {
  if (total <= 0) return 0
  return Math.round((used / total) * 100)
}

function timeLeft(iso: string | null): string {
  if (!iso) return ''
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'expired'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 48) return `${Math.floor(h / 24)}d ${h % 24}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function Quota() {
  const [keys, setKeys] = useState<OAuthKey[]>([])
  const [providers, setProviders] = useState<Record<string, ProviderMeta>>({})
  const [quotaMap, setQuotaMap] = useState<Record<string, QuotaData>>({})
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiFetch('/usage/keys').then(r => r.json()),
      apiFetch('/providers').then(r => r.json()),
    ]).then(([keyData, provData]) => {
      setKeys(keyData)
      const pm: Record<string, ProviderMeta> = {}
      provData.forEach((p: ProviderMeta) => { pm[p.id] = p })
      setProviders(pm)
      keyData.forEach((k: OAuthKey) => fetchQuota(k.id))
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const fetchQuota = async (keyId: string) => {
    try {
      const res = await apiFetch(`/usage/quota/${keyId}`)
      const data = await res.json()
      setQuotaMap(prev => ({ ...prev, [keyId]: data }))
    } catch (e) {
      console.error('Failed:', e)
    }
  }

  const handleRefresh = async (keyId: string) => {
    setRefreshing(prev => ({ ...prev, [keyId]: true }))
    try {
      const res = await apiFetch(`/usage/refresh/${keyId}`, { method: 'POST' })
      const data = await res.json()
      if (data.ok) fetchQuota(keyId)
      else console.error('Refresh failed:', data.error)
    } catch (e) {
      console.error('Refresh error:', e)
    }
    setRefreshing(prev => ({ ...prev, [keyId]: false }))
  }

  const barColor = (used: number, total: number, remaining: number) => {
    if (remaining <= 0) return 'bg-red-500'
    const p = pct(used, total)
    if (p >= 90) return 'bg-red-500'
    if (p >= 70) return 'bg-amber-500'
    return 'bg-cyan-500'
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-xs font-mono text-slate-500 animate-pulse">LOADING...</div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent"
            style={{ textShadow: '0 0 30px rgba(6,182,212,0.3)' }}>
            QUOTA
          </h1>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5">{keys.length} OAuth keys</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {keys.map(key => {
          const q = quotaMap[key.id]
          const meta = providers[key.provider_id]
          const color = meta?.color || '#6366F1'
          const icon = meta?.icon_url || ''
          const name = meta?.display_name || key.provider_id

          const isExpired = q?.expires_at ? new Date(q.expires_at).getTime() < Date.now() : false
          const isZero = q?.rate_limits?.some(rl => rl.remaining <= 0)
          const noExpiry = !q?.expires_at // null = no expiry (fb etc)

          return (
            <div key={key.id}
              className={`rounded-xl border transition-all p-4 ${
                isExpired || isZero
                  ? 'border-red-500/30 bg-red-950/10'
                  : 'border-white/[0.06] bg-[#0a0f1e]/60 hover:border-white/[0.12]'
              }`}
              style={isExpired || isZero ? { boxShadow: '0 0 20px rgba(239,68,68,0.08)' } : {}}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center border shrink-0"
                  style={{ background: `${color}15`, borderColor: `${color}30` }}>
                  {icon ? (
                    <img src={icon} alt="" className="w-5 h-5 object-contain" />
                  ) : (
                    <span className="text-xs font-bold" style={{ color }}>{key.provider_id.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isExpired || isZero ? 'bg-red-500' : q?.rate_limits?.length ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                    <span className="text-sm font-semibold text-slate-200 truncate">{key.label || name}</span>
                  </div>
                  <div className="text-[9px] font-mono text-slate-600">{name}</div>
                </div>
              </div>

              {/* Token: Expires at + Last refresh (always shown) */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {/* Expires at */}
                <div className={`px-3 py-2.5 rounded-lg border ${
                  isExpired
                    ? 'bg-red-950/20 border-red-900/40'
                    : 'bg-white/[0.03] border-white/[0.06]'
                }`}>
                  <div className="text-[8px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    Expires at
                    {q?.key_plan && (
                      <span className="text-[7px] font-mono px-1 py-0.5 rounded-full border text-emerald-300 border-emerald-500/20 bg-emerald-500/10 leading-none">
                        {q.key_plan}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {noExpiry ? (
                      <span className="text-[14px] font-mono text-cyan-300">∞</span>
                    ) : isExpired ? (
                      <span className="text-[10px] font-mono font-semibold text-red-400">EXPIRED</span>
                    ) : (
                      <span className="text-[10px] font-mono font-semibold text-cyan-300">
                        {timeLeft(q?.expires_at ?? null)}
                      </span>
                    )}
                  </div>
                  {isExpired && (
                    <button onClick={() => handleRefresh(key.id)} disabled={refreshing[key.id]}
                      className="mt-2 w-full py-1.5 rounded-lg text-[10px] font-mono font-semibold text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all disabled:opacity-50">
                      {refreshing[key.id] ? '↻ Refreshing...' : '↻ Refresh Token'}
                    </button>
                  )}
                </div>

                {/* Last refresh */}
                <div className={`px-3 py-2.5 rounded-lg border ${
                  isExpired ? 'bg-red-950/10 border-red-900/30' : 'bg-white/[0.03] border-white/[0.06]'
                }`}>
                  <div className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">Last refresh</div>
                  <div className="mt-0.5">
                    {q?.last_refresh ? (
                      <span className="text-[10px] font-mono font-semibold text-slate-300">
                        {new Date(q.last_refresh).toLocaleDateString('en-GB', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500">-</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Rate limits — only when data exists */}
              {q?.rate_limits && q.rate_limits.length > 0 && (
                <div className="space-y-2.5">
                  {q.rate_limits.map((rl, i) => {
                    const depleted = rl.remaining <= 0
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-[11px] font-mono font-semibold capitalize ${depleted ? 'text-red-400' : 'text-slate-300'}`}>
                            {rl.name}
                          </span>
                          <span className={`text-[11px] font-mono ${depleted ? 'text-red-400' : 'text-slate-400'}`}>
                            {fmt(rl.used)} / {fmt(rl.limit)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${barColor(rl.used, rl.limit, rl.remaining)}`}
                            style={{ width: `${Math.min(pct(rl.used, rl.limit), 100)}%` }} />
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className={`text-[10px] font-mono ${depleted ? 'text-red-400' : 'text-slate-500'}`}>
                            {depleted ? '0 remaining' : `${fmt(rl.remaining)} left`}
                          </span>
                          {rl.reset_at && (
                            <span className="text-[11px] font-mono font-bold text-cyan-300/90">
                              ↻ {timeLeft(rl.reset_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!loading && keys.length === 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1e]/60 p-12 text-center">
          <div className="text-xs font-mono text-slate-600">No OAuth keys found</div>
        </div>
      )}
    </div>
  )
}
