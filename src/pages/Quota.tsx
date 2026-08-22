import { useEffect, useMemo, useState } from 'react'
import { getProviders, getUsageQuota, refreshUsageKey, getOAuthKeys, iconUrl } from '../api'
import type { OAuthKey, ProviderMeta, QuotaData, RateLimit } from '../api'

const formatDate = (iso: string | null) => iso ? new Date(iso).toLocaleString() : '—'

function formatCountdown(iso: string | null) {
  if (!iso) return null
  const seconds = Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000))
  if (seconds <= 0) return 'now'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return days ? `${days}d ${hours}h` : hours ? `${hours}h ${minutes}m` : `${minutes}m`
}

function RefreshIcon({ spinning = false }: { spinning?: boolean }) {
  return <svg aria-hidden="true" className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 11a8 8 0 0 0-14.7-3L3 11" /><path d="M3 5v6h6" />
    <path d="M4 13a8 8 0 0 0 14.7 3L21 13" /><path d="M21 19v-6h-6" />
  </svg>
}

function InfoIcon() {
  return <svg aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" />
  </svg>
}

function quotaColor(remaining: number) {
  if (remaining > 70) return { text: 'text-green-500', bar: 'bg-green-500', track: 'bg-green-500/10' }
  if (remaining >= 30) return { text: 'text-yellow-500', bar: 'bg-yellow-500', track: 'bg-yellow-500/10' }
  return { text: 'text-red-500', bar: 'bg-red-500', track: 'bg-red-500/10' }
}

function ProviderLogo({ provider, color }: { provider: string; color?: string }) {
  const fallback = color || '#6b7280'
  return <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg p-1.5" style={{ backgroundColor: `${fallback}18` }}>
    <img src={`/providers/${provider}.png`} alt="" className="h-full w-full rounded object-contain" onError={event => { event.currentTarget.src = '/providers/custom-provider.jpg' }} />
  </div>
}

function QuotaRow({ quota }: { quota: RateLimit }) {
  const unlimited = quota.limit <= 0
  const remaining = unlimited ? 100 : Math.max(0, Math.min(100, Math.round((quota.remaining / quota.limit) * 100)))
  const colors = quotaColor(remaining)
  const countdown = formatCountdown(quota.reset_at)

  return <div className="space-y-2">
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="font-semibold text-slate-100">{quota.name}</span>
      <span className={`font-medium ${colors.text}`}>{unlimited ? 'Unlimited' : `${remaining}%`}</span>
    </div>
    {!unlimited && <div className={`h-2 overflow-hidden rounded-full ${colors.track}`}>
      <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${remaining}%` }} />
    </div>}
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
      <span>{unlimited ? 'No usage limit' : `${quota.used.toLocaleString()} / ${quota.limit.toLocaleString()} requests`}</span>
      {countdown && <span>Reset in {countdown}</span>}
    </div>
    {quota.reset_at && <div className="text-xs text-slate-600">Reset at {formatDate(quota.reset_at)}</div>}
  </div>
}

export default function Quota() {
  const [keys, setKeys] = useState<OAuthKey[]>([])
  const [providers, setProviders] = useState<Record<string, ProviderMeta>>({})
  const [quotas, setQuotas] = useState<Record<string, QuotaData>>({})
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [providerFilter, setProviderFilter] = useState('all')
  const [providerOpen, setProviderOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const oauth = await getOAuthKeys()
        if (!alive) return
        setKeys(oauth)
        try {
          const providerRows = await getProviders()
          if (alive) setProviders(Object.fromEntries(providerRows.map(provider => [provider.id, provider])))
        } catch (providerError) {
          console.error('[quota] providers failed:', providerError)
        }
        const rows = await Promise.allSettled(oauth.map(async key => [key.id, await getUsageQuota(key.id)] as const))
        if (alive) {
          setQuotas(Object.fromEntries(rows.flatMap(row => row.status === 'fulfilled' ? [row.value] : [])))
          rows.filter(row => row.status === 'rejected').forEach(row => console.error('[quota] detail failed:', row.reason))
        }
      } catch (loadError) {
        if (alive) setError(String(loadError))
      }
    }
    load()
    return () => { alive = false }
  }, [])

  const providerIds = useMemo(() => [...new Set(keys.map(key => key.provider_id))].sort(), [keys])
  const visibleKeys = useMemo(() => providerFilter === 'all' ? keys : keys.filter(key => key.provider_id === providerFilter), [keys, providerFilter])

  const refresh = async (id: string) => {
    setBusy(current => ({ ...current, [id]: true }))
    setError('')
    try {
      const result = await refreshUsageKey(id)
      if (!result.success) throw new Error(result.error || 'Refresh failed')
      const quota = await getUsageQuota(id)
      setQuotas(current => ({ ...current, [id]: quota }))
    } catch (refreshError) {
      setError(String(refreshError))
    } finally {
      setBusy(current => ({ ...current, [id]: false }))
    }
  }

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Quota</h1>
        <p className="mt-1 text-sm text-slate-500">Provider usage limits and reset times.</p>
      </div>
      <div className="flex w-full items-center sm:w-auto">
        <div className="relative w-full sm:w-auto">
          <button type="button" aria-label="Filter by provider" aria-haspopup="listbox" aria-expanded={providerOpen} onClick={() => setProviderOpen(value => !value)} className="flex w-full min-w-48 items-center gap-2 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 shadow-sm outline-none transition-colors hover:border-white/20 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10">
            {providerFilter !== 'all' && (() => {
              const provider = providers[providerFilter]
              return <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded border" style={{ backgroundColor: `${provider?.color || '#64748b'}18`, borderColor: `${provider?.color || '#64748b'}50` }}>
                {provider?.icon_name ? <img src={iconUrl(provider.icon_name)} alt="" className="h-full w-full object-contain p-0.5" /> : <span className="text-[9px] text-slate-400">{(provider?.display_name || providerFilter)[0]}</span>}
              </div>
            })()}
            <span className="flex-1 truncate text-left">{providerFilter === 'all' ? 'All providers' : providers[providerFilter]?.display_name || providerFilter}</span>
            <span className="text-xs text-slate-500">{providerFilter === 'all' ? keys.length : keys.filter(key => key.provider_id === providerFilter).length}</span>
            <svg aria-hidden="true" className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${providerOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 1 1-1.08 1.04l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" /></svg>
          </button>
          {providerOpen && <>
            <div className="fixed inset-0 z-10" onClick={() => setProviderOpen(false)} />
            <div role="listbox" className="absolute left-0 right-0 z-20 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-white/[0.06] bg-slate-900/95 py-1 shadow-2xl backdrop-blur-xl">
              <button type="button" role="option" aria-selected={providerFilter === 'all'} onClick={() => { setProviderFilter('all'); setProviderOpen(false) }} className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors ${providerFilter === 'all' ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'}`}>
                <span className="flex h-5 w-5 items-center justify-center rounded border border-white/[0.05] bg-black/40 text-xs text-slate-500">☷</span>
                <span className="flex-1 text-left">All providers</span><span className="text-xs text-slate-500">{keys.length}</span>{providerFilter === 'all' && <span className="text-cyan-400">✓</span>}
              </button>
              {providerIds.map(id => {
                const provider = providers[id]
                const name = provider?.display_name || id
                const color = provider?.color || '#64748b'
                return <button type="button" role="option" aria-selected={providerFilter === id} key={id} onClick={() => { setProviderFilter(id); setProviderOpen(false) }} className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors ${providerFilter === id ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'}`}>
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded border bg-black/40" style={{ borderColor: `${color}50` }}>{provider?.icon_name ? <img src={iconUrl(provider.icon_name)} alt="" className="h-full w-full object-contain p-0.5" /> : <span className="text-[9px] text-slate-400">{name[0]}</span>}</span>
                  <span className="flex-1 truncate text-left">{name}</span><span className="text-xs text-slate-500">{keys.filter(key => key.provider_id === id).length}</span>{providerFilter === id && <span className="text-cyan-400">✓</span>}
                </button>
              })}
            </div>
          </>}
        </div>
      </div>
    </header>

    {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
    {!keys.length && <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">No OAuth keys found</div>}
    {!!keys.length && !visibleKeys.length && <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">No OAuth keys for this provider</div>}

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {visibleKeys.map(key => {
        const quota = quotas[key.id]
        const provider = providers[key.provider_id]
        const plan = quota?.key_plan
        const canRefresh = key.provider_id === 'cx'
        return <article key={key.id} className="flex flex-col gap-4 rounded-xl border border-white/10 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <ProviderLogo provider={key.provider_id} color={provider?.color} />
              <div className="min-w-0">
                <h2 className="truncate font-semibold text-slate-100">{provider?.display_name || key.provider_id}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="truncate text-xs text-slate-500">{key.label || 'OAuth account'}</span>
                  {plan && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-300">{plan}</span>}
                </div>
              </div>
            </div>
            <button type="button" onClick={() => refresh(key.id)} disabled={!canRefresh || busy[key.id]} aria-label={canRefresh ? 'Refresh quota' : 'Refresh unavailable'} title={canRefresh ? 'Refresh quota' : 'Refresh unavailable'} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40">
              <RefreshIcon spinning={busy[key.id]} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 border-y border-white/10 py-3 text-xs">
            <div><div className="text-slate-500">Expires</div><div className="mt-1 text-slate-300">{formatDate(quota?.expires_at || null)}</div></div>
            <div><div className="text-slate-500">Last refresh</div><div className="mt-1 text-slate-300">{formatDate(quota?.last_refresh || null)}</div></div>
          </div>

          {quota?.error && <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-300"><InfoIcon />{quota.error}</div>}
          {key.provider_id === 'cx' && quota?.reset_credits && <div className="flex items-center justify-between border-b border-white/10 pb-3 text-xs"><span className="text-slate-500">Rate-limit reset credits</span><span className="text-slate-300">{quota.reset_credits.available_count} available · {quota.reset_credits.applicable_available_count} applicable</span></div>}
          {quota?.rate_limits?.length ? <div className="space-y-4">{quota.rate_limits.map((rate, index) => <QuotaRow key={`${rate.name}-${index}`} quota={rate} />)}</div> : <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-3 text-sm text-blue-300"><InfoIcon />Quota data unavailable for this provider.</div>}
        </article>
      })}
    </div>
  </div>
}
