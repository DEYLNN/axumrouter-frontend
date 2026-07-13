import Modal from '../components/Modal'
import { useState, useEffect } from 'react'

import { apiFetch } from '../api'

interface ComboTier {
  tier: number
  provider: string
  model: string
  role: string
}

interface Combo {
  id: string
  name: string
  description: string
  tiers: ComboTier[]
  round_robin: boolean
  is_active: boolean
  created_at: string
}

interface ProviderMeta {
  id: string
  display_name: string
  color: string
  icon_url: string
  total_keys: number
}

interface AllModels {
  [provider: string]: { id: string; enabled: boolean; owned_by: string }[]
}

export default function Combos() {
  const [combos, setCombos] = useState<Combo[]>([])
  const [providers, setProviders] = useState<ProviderMeta[]>([])
  const [allModels, setAllModels] = useState<AllModels>({})
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [modelSearch, setModelSearch] = useState('')

  const load = () => {
    apiFetch('/combos').then(r => r.json()).then(setCombos).catch(console.error)
    apiFetch('/providers').then(r => r.json()).then(setProviders).catch(console.error)
  }

  useEffect(load, [])

  const createCombo = async () => {
    if (!newName.trim() || selectedModels.length === 0) return
    setCreating(true)
    try {
      const tiers = selectedModels.map((mid, i) => {
        const [prov] = mid.split('/')
        return {
          tier: i + 1,
          provider: prov,
          model: mid,
          role: i === 0 ? 'PRIMARY' : 'fallback',
        }
      })
      const res = await apiFetch('/combos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim(), tiers }),
      })
      const data = await res.json()
      if (data.ok) {
        setShowCreate(false)
        setNewName('')
        setNewDesc('')
        setSelectedModels([])
        load()
      }
    } catch (e) {}
    setCreating(false)
  }

  const deleteCombo = async (id: string) => {
    await apiFetch(`/combos/${id}`, { method: 'DELETE' })
    load()
  }

  const toggleCombo = async (id: string) => {
    await apiFetch(`/combos/${id}/toggle`, { method: 'POST' })
    load()
  }

  const openPicker = async () => {
    try {
      const r = await apiFetch('/models/all')
      const data = await r.json()
      setAllModels(data)
    } catch (e) {
      // fallback: fetch each provider detail
      const m: AllModels = {}
      for (const p of providers) {
        try {
          const r = await apiFetch(`/providers/${p.id}`)
          const d = await r.json()
          m[p.id] = (d.models || []).map((md: any) => ({ id: md.id, enabled: true, owned_by: p.id }))
        } catch (_) {}
      }
      setAllModels(m)
    }
    setShowPicker(true)
  }

  const toggleSelect = (modelId: string) => {
    setSelectedModels(prev =>
      prev.includes(modelId) ? prev.filter(m => m !== modelId) : [...prev, modelId]
    )
  }

  const moveModel = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= selectedModels.length) return
    setSelectedModels(prev => {
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]]
      return next
    })
  }

  const removeSelected = (modelId: string) => {
    setSelectedModels(prev => prev.filter(m => m !== modelId))
  }

  const providerDisplay = (id: string) => providers.find(p => p.id === id)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent"
            style={{ textShadow: '0 0 30px rgba(6,182,212,0.3)' }}>
            COMBOS
          </h1>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5">{combos.length} combos</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-lg text-[11px] font-mono font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all"
          style={{ boxShadow: '0 0 10px rgba(6,182,212,0.1)' }}>
          + New Combo
        </button>
      </div>

      {/* Combo cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {combos.map(c => {
          const primary = c.tiers.find(t => t.role === 'PRIMARY') || c.tiers[0]
          const fallbacks = c.tiers.filter(t => t.role !== 'PRIMARY')
          return (
            <div key={c.id}
              className={`rounded-xl border transition-all p-5 ${
                c.is_active
                  ? 'border-white/[0.06] bg-[#0a0f1e]/60 hover:border-cyan-500/30'
                  : 'border-white/[0.03] bg-[#0a0f1e]/30 opacity-60'
              }`}
              style={{ boxShadow: c.is_active ? 'inset 0 1px 0 rgba(6,182,212,0.06)' : 'none' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${c.is_active ? 'bg-emerald-500' : 'bg-slate-700'}`}
                    style={c.is_active ? { boxShadow: '0 0 6px rgba(52,211,153,0.5)' } : {}} />
                  <div>
                    <h2 className="text-sm font-semibold text-slate-200">{c.name}</h2>
                    {c.description && <p className="text-[10px] font-mono text-slate-600 mt-0.5">{c.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleCombo(c.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/[0.06] transition-all text-slate-500 hover:text-slate-300">
                    {c.is_active ? '⏸' : '▶'}
                  </button>
                  <button onClick={() => deleteCombo(c.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-500/10 transition-all text-slate-500 hover:text-red-400">
                    ✕
                  </button>
                </div>
              </div>

              {/* Tiers */}
              <div className="space-y-2">
                {primary && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                    <span className="text-[9px] font-mono font-semibold text-emerald-400 uppercase tracking-wider">T1</span>
                    <span className="text-[10px] font-mono text-slate-300">{primary.provider}/{primary.model.replace(primary.provider + '/', '')}</span>
                    <span className="text-[8px] font-mono text-emerald-400/60 uppercase">PRIMARY</span>
                  </div>
                )}
                {fallbacks.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-[9px] font-mono font-semibold text-slate-600">T{t.tier}</span>
                    <span className="text-[10px] font-mono text-slate-400">{t.provider}/{t.model.replace(t.provider + '/', '')}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        {combos.length === 0 && (
          <div className="col-span-2 py-16 text-center text-[10px] font-mono text-slate-600 border border-dashed border-white/[0.06] rounded-xl">
            No combos yet. Click "+ New Combo" to create one.
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => !creating && setShowCreate(false)} maxWidth="max-w-lg">

            <h2 className="text-sm font-bold text-slate-200 mb-4">Create Combo</h2>

            <div className="space-y-3 mb-4">
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Combo name"
                className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all" />
              <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all" />
            </div>

            {/* Pick Models button */}
            <div className="mb-4">
              <button onClick={openPicker}
                className="w-full py-3 rounded-xl text-xs font-mono font-semibold text-cyan-300 bg-cyan-500/8 border border-dashed border-cyan-500/30 hover:bg-cyan-500/15 hover:border-cyan-500/50 transition-all">
                {selectedModels.length === 0 ? '+ Pick Models' : `+ Pick Models (${selectedModels.length} selected)`}
              </button>
            </div>

            {/* Selected models as ordered tiers */}
            {selectedModels.length > 0 && (
              <div className="space-y-1.5 mb-4">
                <div className="text-[9px] font-mono text-slate-600 uppercase tracking-wider mb-1.5">
                  Tiers · {selectedModels.length} models
                </div>
                {selectedModels.map((mid, i) => {
                  const [prov, ...rest] = mid.split('/')
                  const modelName = rest.join('/')
                  const pm = providerDisplay(prov)
                  return (
                    <div key={mid}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                        i === 0 ? 'bg-emerald-500/8 border border-emerald-500/20' : 'bg-black/40 border border-white/[0.04]'
                      }`}>
                      <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 text-[9px] font-mono font-bold ${
                        i === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/10 text-cyan-400'
                      }`}>{i + 1}</div>
                      {pm && (
                        <div className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                          style={{ background: `${pm.color}20` }}>
                          {pm.icon_url ? <img src={pm.icon_url} alt="" className="w-2.5 h-2.5 object-contain" /> : null}
                        </div>
                      )}
                      <span className="text-[10px] font-mono text-slate-300 flex-1 truncate">{prov}/{modelName}</span>
                      {i === 0 && <span className="text-[7px] font-mono font-semibold text-emerald-400/70 uppercase tracking-wider">PRIMARY</span>}
                      <div className="flex items-center gap-0.5">
                        {i > 0 && <button onClick={() => moveModel(i, -1)} className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-slate-300">↑</button>}
                        {i < selectedModels.length - 1 && <button onClick={() => moveModel(i, 1)} className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-slate-300">↓</button>}
                        <button onClick={() => removeSelected(mid)} className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-red-400">✕</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button onClick={createCombo} disabled={creating || !newName.trim() || selectedModels.length === 0}
                className="flex-1 py-2.5 rounded-lg text-[11px] font-mono font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all disabled:opacity-40">
                {creating ? 'Creating...' : `Create (${selectedModels.length} tiers)`}
              </button>
              <button onClick={() => setShowCreate(false)} disabled={creating}
                className="px-4 py-2.5 rounded-lg text-[11px] font-mono text-slate-500 hover:text-slate-300 transition-all">Cancel</button>
            </div>
        </Modal>

      {/* Model picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowPicker(false)}>
          <div className="w-full max-w-lg mx-4 max-h-[80vh] rounded-2xl border border-white/[0.06] bg-[#0a0f1e] backdrop-blur-xl overflow-hidden flex flex-col"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between shrink-0">
              <h2 className="text-xs font-mono font-bold text-slate-200">Pick Models</h2>
              <button onClick={() => setShowPicker(false)}
                className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-3 border-b border-white/[0.04] shrink-0">
              <input type="text" value={modelSearch} onChange={e => setModelSearch(e.target.value)}
                placeholder="Search models..."
                className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all" />
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {Object.entries(allModels).map(([providerId, models]) => {
                const pm = providerDisplay(providerId)
                const filtered = models.filter(m => !modelSearch || m.id.toLowerCase().includes(modelSearch.toLowerCase()))
                if (filtered.length === 0) return null
                return (
                  <div key={providerId}>
                    <div className="flex items-center gap-2 mb-2">
                      {pm && (
                        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                          style={{ background: `${pm.color}20` }}>
                          {pm.icon_url ? <img src={pm.icon_url} alt="" className="w-3 h-3 object-contain" /> : null}
                        </div>
                      )}
                      <span className="text-[9px] font-mono font-semibold text-slate-500 uppercase tracking-wider">{pm?.display_name || providerId}</span>
                      <div className="h-px flex-1 bg-white/[0.04]" />
                    </div>
                    <div className="space-y-0.5">
                      {filtered.map(m => {
                        const sel = selectedModels.includes(m.id)
                        return (
                          <div key={m.id} onClick={() => toggleSelect(m.id)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                              sel ? 'bg-cyan-500/10 border border-cyan-500/20' : 'hover:bg-white/[0.03] border border-transparent'
                            }`}>
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                              sel ? 'bg-cyan-400 border-cyan-400' : 'border-slate-600'
                            }`}>
                              {sel && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                <path d="M5 13l4 4L19 7" />
                              </svg>}
                            </div>
                            <span className="text-xs font-mono text-slate-300 flex-1">{m.id}</span>
                            {!m.enabled && <span className="text-[8px] font-mono text-red-400/50">disabled</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="px-5 py-3 border-t border-white/[0.04] flex items-center justify-between shrink-0 bg-[#0a0f1e]">
              <span className="text-[10px] font-mono text-slate-500">{selectedModels.length} selected</span>
              <button onClick={() => setShowPicker(false)}
                className="px-4 py-2 rounded-lg text-[11px] font-mono font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
