import { useState } from 'react'
import type { ProviderMeta } from '../api'

interface ToggleModel { id: string; owned_by: string; enabled: boolean; toggling?: boolean }

type Category = 'apikey' | 'oauth'
const catLabel = (cat: string): string => cat === 'apikey' ? "API Key" : 'OAuth'

interface Props {
  providers: ProviderMeta[] | null
  models: Record<string, ToggleModel[]>
  onToggleModel: (modelId: string, enabled: boolean) => void
  onFetchModels: () => void
}

export default function ModelsSection({ providers, models, onToggleModel }: Props) {
  const [search, setSearch] = useState('')

  const grouped = providers?.reduce((acc, p) => {
    const cat = (p.type || 'apikey') as Category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {} as Record<Category, ProviderMeta[]>) ?? {} as Record<Category, ProviderMeta[]>

  const filter = (list: ToggleModel[]) => {
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter(m => m.id.toLowerCase().includes(q))
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1e]/60 backdrop-blur-xl overflow-hidden"
      style={{ boxShadow: 'inset 0 1px 0 rgba(6,182,212,0.06)' }}>
      <div className="px-5 py-4 border-b border-white/[0.04]">
        <h2 className="text-xs font-mono font-bold text-cyan-400 tracking-wider"
          style={{ textShadow: '0 0 10px rgba(6,182,212,0.3)' }}>MODELS</h2>
      </div>
      <div className="px-5 py-3 border-b border-white/[0.04]">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search models..."
          className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all" />
      </div>
      <div className="p-5 space-y-6">
        {Object.entries(grouped).map(([cat, provs]) => (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
              <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider">{catLabel(cat)}</span>
              <div className="h-px flex-1 bg-white/[0.04]" />
            </div>
            <div className="space-y-3">
              {provs.filter(p => p.total_keys > 0).map(p => {
                const pm = models[p.id]
                const filtered = pm ? filter(pm) : null
                const hasMatch = !search || pm?.some(m => m.id.toLowerCase().includes(search.toLowerCase()))
                if (search && !hasMatch && (!filtered || filtered.length === 0)) return null
                return (
                  <div key={p.id} className="rounded-xl border border-white/[0.04] bg-black/40 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${p.color}15`, border: `1px solid ${p.color}25` }}>
                          {p.icon_url ? <img src={p.icon_url} alt="" className="w-4 h-4 object-contain" /> : <span className="text-[9px] font-bold" style={{ color: p.color }}>{p.id.charAt(0).toUpperCase()}</span>}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-slate-200 truncate">{p.display_name}</div>
                          <div className="text-[9px] font-mono text-slate-600">{p.id}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {p.total_keys > 0 && <span className="text-[9px] font-mono text-emerald-400/70">{p.total_keys} keys</span>}
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.active_keys > 0 ? '#34d399' : '#475569' }} />
                      </div>
                    </div>
                    {filtered ? (
                      <div className="px-4 py-2 space-y-0.5">
                        {filtered.map(m => (
                          <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.02] transition-all">
                            <span className={`text-[11px] font-mono ${m.enabled ? 'text-slate-400' : 'text-red-400/50 line-through'}`}>{m.id}</span>
                            <button onClick={() => onToggleModel(m.id, !m.enabled)} disabled={m.toggling}
                              className={`relative w-9 h-5 rounded-full transition-all ${m.enabled ? 'bg-emerald-500/40' : 'bg-slate-700/50'} ${m.toggling ? 'opacity-50' : ''}`}
                              style={m.enabled ? { boxShadow: '0 0 8px rgba(52,211,153,0.2)' } : {}}>
                              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${m.enabled ? 'left-[18px]' : 'left-[2px]'}`} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : <div className="px-4 py-3 text-[10px] font-mono text-slate-600 animate-pulse">Loading models...</div>}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
