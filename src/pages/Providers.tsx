import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getProviders } from '../api'
import { useAsync } from '../hooks/useAsync'
import { Loading } from '../components/Loading'
import { ErrorBox } from '../components/ErrorBox'

const groups = [
  { label: 'API Key', key: 'apikey' },
  { label: 'OAuth', key: 'oauth' },
  { label: 'Custom', key: 'custom' },
]

export default function Providers() {
  const { data: providers, loading, error, refetch } = useAsync(getProviders, [])
  const [search, setSearch] = useState('')

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} onRetry={refetch} />
  if (!providers) return null

  const filtered = providers.filter(p =>
    !search || p.display_name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase())
  )

  const grouped = groups
    .map(g => ({ ...g, items: filtered
      .filter(p => p.type === g.key)
      .sort((a, b) => {
        // Have key first, then no key (per category)
        if ((a.total_keys > 0) !== (b.total_keys > 0)) return a.total_keys > 0 ? -1 : 1
        return 0 // preserve API response order ≈ newest first
      })
    }))
    .filter(g => g.items.length > 0)

  return (
    <div className="relative">
      <div className="space-y-5">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent"
                style={{ textShadow: '0 0 30px rgba(6,182,212,0.3)' }}>
                PROVIDERS
              </h1>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5">{providers.length} providers</p>
            </div>
          </div>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search providers..."
            className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2.5 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all"
            style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }} />
        </div>

        {search && filtered.length === 0 ? (
          <div className="py-12 text-center text-[10px] font-mono text-slate-600">No providers match &ldquo;{search}&rdquo;</div>
        ) : (
          grouped.map(group => (
            <div key={group.key}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-[10px] font-mono font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {group.label}
                </h2>
                <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] via-cyan-500/10 to-transparent" />
                <span className="text-[10px] font-mono text-slate-600">{group.items.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {group.items.map(p => {
                  const active = p.total_keys > 0
                  const accent = p.color || '#6366F1'
                  return (
                    <Link key={p.id} to={`/admin/providers/${p.id}`}
                      className="group relative block rounded-2xl border transition-all duration-300 bg-[#0a0f1e]/60 backdrop-blur-xl"
                      style={{
                        borderColor: active ? `${accent}25` : 'rgba(255,255,255,0.05)',
                        boxShadow: active ? `inset 0 0 20px ${accent}05, 0 0 10px ${accent}08` : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                      }}>
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3.5">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm border ${p.icon_url ? 'bg-black/50' : 'bg-black/40'}`}
                              style={{ borderColor: `${accent}30`, boxShadow: `0 0 8px ${accent}10` }}>
                              {p.icon_url ? (
                                <img src={p.icon_url} alt="" className="w-5 h-5 object-contain" />
                              ) : (
                                <span className="text-sm font-semibold font-mono" style={{ color: accent }}>
                                  {p.display_name.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div>
                              <h2 className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors leading-tight">
                                {p.display_name}
                              </h2>
                              <span className="text-[10px] font-mono text-slate-600 mt-0.5 block">{p.id}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${active ? 'bg-emerald-500' : 'bg-slate-700'}`}
                              style={active ? { boxShadow: '0 0 6px rgba(52,211,153,0.5)' } : {}} />
                            <svg className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-500 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex items-center gap-5 text-[11px] font-mono">
                          <div>
                            <span className="text-slate-300">{p.active_keys}</span>
                            <span className="text-slate-600 ml-1.5">active</span>
                          </div>
                          <div className="text-slate-600">{p.total_keys} total</div>
                          {p.locked_keys > 0 && <div className="text-red-400/80">{p.locked_keys} locked</div>}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
