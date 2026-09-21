import Modal from '../components/Modal'
import { useState, useEffect } from 'react'

import { iconUrl, apiFetch } from '../api'
import type { ProviderMeta } from '../api'

interface Combo {
  id: string
  name: string
  strategy: string
  tiers: string[]
  is_active: boolean
  min_context: number
  created_at: string
  updated_at: string
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
  const [strategy, setStrategy] = useState('fallback')
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [modelSearch, setModelSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = () => {
    apiFetch('/combos').then(r => r.json()).then(setCombos).catch(console.error)
    apiFetch('/providers').then(r => r.json()).then(setProviders).catch(console.error)
  }

  useEffect(load, [])

  const createCombo = async () => {
    if (!newName.trim() || selectedModels.length === 0) return
    setCreating(true)
    try {
      const body = { name: newName.trim(), strategy, tiers: selectedModels }
      const url = editingId ? `/combos/${editingId}` : '/combos'
      const res = await apiFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.ok) {
        setShowCreate(false)
        setNewName('')
        setStrategy('fallback')
        setSelectedModels([])
        setEditingId(null)
        load()
      }
    } catch (e) {
      console.error('Create combo failed:', e)
    }
    setCreating(false)
  }

  const deleteCombo = async (id: string) => {
    await apiFetch(`/combos/${id}`, { method: 'DELETE' })
    load()
  }

  const editCombo = (c: Combo) => {
    setEditingId(c.id)
    setNewName(c.name)
    setStrategy(c.strategy)
    setSelectedModels(c.tiers)
    setShowCreate(true)
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
    } catch { /* noop */ }
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
          <h1 className="heading-brutal text-3xl uppercase tracking-tight">COMBOS</h1>
          <p className="text-lg font-medium text-gray-600">{combos.length} combos</p>
        </div>
        <button onClick={() => {
          setEditingId(null); setNewName(''); setStrategy('fallback'); setSelectedModels([]); setShowCreate(true)
        }}
          className="brutal-btn bg-[#ff3d81] text-white px-4 py-2 text-sm font-bold">
          + New Combo
        </button>
      </div>

      {/* Combo cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {combos.map(c => (
          <div key={c.id}
            className={`brutal-card p-5 ${!c.is_active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full border-2 border-[#111111] ${c.is_active ? 'bg-[#3ddc97]' : 'bg-gray-300'}`} />
                <div>
                  <h2 className="text-sm font-bold text-[#111111]">{c.name}</h2>
                  <p className="text-[10px] mono-brutal text-gray-500 mt-0.5">
                    {c.strategy === 'round_robin' ? '🔀 round-robin' : '↳ fallback'} · {c.tiers.length} tiers
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleCombo(c.id)}
                  className={`relative w-10 h-5 rounded-full border-2 border-[#111111] transition-colors ${c.is_active ? 'bg-[#3ddc97]' : 'bg-gray-200'}`}
                  title={c.is_active ? 'Active' : 'Paused'}>
                  <div className={`absolute top-0 left-0 w-4 h-4 rounded-full bg-white border-2 border-[#111111] transition-transform ${
                    c.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                <button onClick={() => deleteCombo(c.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-[#ff6b5e] hover:bg-[#ff6b5e]/10 transition-all border-2 border-transparent hover:border-[#ff6b5e]">
                  ✕
                </button>
                <button onClick={() => editCombo(c)}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-[#ff3d81] hover:bg-[#ff3d81]/10 transition-all border-2 border-transparent hover:border-[#ff3d81]">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Tiers */}
            <div className="space-y-2">
              {c.tiers.map((tier, i) => (
                <div key={i}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 ${
                    i === 0 ? 'bg-[#3ddc97]/10 border-[#3ddc97]' : 'bg-[#f0f0f0] border-[#111111]'
                  }`}>
                  <span className={`text-[9px] mono-brutal font-bold uppercase tracking-wider ${
                    i === 0 ? 'text-[#3ddc97]' : 'text-gray-500'}`}>T{i + 1}</span>
                  <span className="text-[10px] mono-brutal text-[#111111] font-bold">{tier}</span>
                  {i === 0 && c.strategy === 'fallback' && (
                    <span className="text-[8px] mono-brutal text-[#3ddc97] font-bold uppercase">PRIMARY</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {combos.length === 0 && (
          <div className="col-span-2 brutal-card border-dashed py-16 text-center text-sm mono-brutal text-gray-500">
            No combos yet. Click "+ New Combo" to create one.
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => {
        setShowCreate(false); setEditingId(null); setNewName(''); setStrategy('fallback'); setSelectedModels([])
      }} maxWidth="max-w-lg">
        <h2 className="text-sm font-bold text-[#111111] mb-4">{editingId ? 'Edit Combo' : 'Create Combo'}</h2>

        <div className="space-y-3 mb-4">
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Combo name"
            className="w-full px-3 py-2.5 border-2 border-[#111111] rounded-lg text-sm mono-brutal bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff3d81] transition-all" />
          <div className="flex gap-2">
            <button onClick={() => setStrategy('fallback')}
              className={`brutal-btn flex-1 py-2 text-xs font-bold ${
                strategy === 'fallback' ? 'bg-[#ff3d81] text-white' : 'bg-white text-gray-500 hover:text-[#111111]'}`}>
              ↳ Fallback
            </button>
            <button onClick={() => setStrategy('round_robin')}
              className={`brutal-btn flex-1 py-2 text-xs font-bold ${
                strategy === 'round_robin' ? 'bg-[#ffd23f] text-[#111111]' : 'bg-white text-gray-500 hover:text-[#111111]'}`}>
              🔀 Round Robin
            </button>
          </div>
        </div>

        {/* Pick Models button */}
        <div className="mb-4">
          <button onClick={openPicker}
            className="brutal-btn w-full py-3 text-sm font-bold bg-white text-[#ff3d81] border-dashed">
            {selectedModels.length === 0 ? '+ Pick Models' : `+ Pick Models (${selectedModels.length} selected)`}
          </button>
        </div>

        {/* Selected models as ordered tiers */}
        {selectedModels.length > 0 && (
          <div className="space-y-1.5 mb-4">
            <div className="text-[9px] mono-brutal text-gray-500 uppercase tracking-wider mb-1.5 font-bold">
              Tiers · {selectedModels.length} models
            </div>
            {selectedModels.map((mid, i) => {
              const [prov, ...rest] = mid.split('/')
              const modelName = rest.join('/')
              const pm = providerDisplay(prov)
              return (
                <div key={mid}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 ${
                    i === 0 ? 'bg-[#3ddc97]/10 border-[#3ddc97]' : 'bg-[#f0f0f0] border-[#111111]'
                  }`}>
                  <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 text-[9px] mono-brutal font-bold border-2 border-[#111111] ${
                    i === 0 ? 'bg-[#3ddc97] text-[#111111]' : 'bg-[#ff3d81] text-white'}`}>{i + 1}</div>
                  {pm && (
                    <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 border border-[#111111]"
                      style={{ background: `${pm.color}20` }}>
                      {pm.icon_name ? <img src={iconUrl(pm.icon_name)} alt="" className="w-2.5 h-2.5 object-contain" /> : null}
                    </div>
                  )}
                  <span className="text-[10px] mono-brutal text-[#111111] font-bold flex-1 truncate">{prov}/{modelName}</span>
                  {i === 0 && strategy === 'fallback' && (
                    <span className="text-[7px] mono-brutal font-bold text-[#3ddc97] uppercase tracking-wider">PRIMARY</span>
                  )}
                  <div className="flex items-center gap-0.5">
                    {i > 0 && <button onClick={() => moveModel(i, -1)} className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-[#111111] font-bold">↑</button>}
                    {i < selectedModels.length - 1 && <button onClick={() => moveModel(i, 1)} className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-[#111111] font-bold">↓</button>}
                    <button onClick={() => removeSelected(mid)} className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-[#ff6b5e] font-bold">✕</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button onClick={createCombo} disabled={creating || !newName.trim() || selectedModels.length === 0}
            className="brutal-btn flex-1 py-2.5 text-sm font-bold bg-[#ff3d81] text-white disabled:opacity-40">
            {creating ? 'Creating...' : `${editingId ? 'Update' : 'Create'} (${selectedModels.length} tiers)`}
          </button>
          <button onClick={() => {
            setShowCreate(false); setEditingId(null); setNewName(''); setStrategy('fallback'); setSelectedModels([])
          }} disabled={creating}
            className="brutal-btn bg-white text-[#111111] px-4 py-2.5 text-sm font-bold">Cancel</button>
        </div>
      </Modal>

      {/* Model picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#111111]/60"
          onClick={() => setShowPicker(false)}>
          <div className="w-full max-w-lg mx-4 max-h-[80vh] brutal-card overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3 border-b-2 border-[#111111] flex items-center justify-between shrink-0 bg-[#f0f0f0]">
              <h2 className="text-xs mono-brutal font-bold text-[#111111] uppercase">Pick Models</h2>
              <button onClick={() => setShowPicker(false)}
                className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:text-[#111111] hover:bg-white transition-all border-2 border-transparent hover:border-[#111111]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-3 border-b-2 border-[#111111] shrink-0">
              <input type="text" value={modelSearch} onChange={e => setModelSearch(e.target.value)}
                placeholder="Search models..."
                className="w-full px-3 py-2 border-2 border-[#111111] rounded-lg text-sm mono-brutal bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff3d81] transition-all" />
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
                        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 border-[#111111]"
                          style={{ background: `${pm.color}20` }}>
                          {pm.icon_name ? <img src={iconUrl(pm.icon_name)} alt="" className="w-3 h-3 object-contain" /> : null}
                        </div>
                      )}
                      <span className="text-[9px] mono-brutal font-bold text-gray-500 uppercase tracking-wider">{pm?.display_name || providerId}</span>
                      <div className="h-0.5 flex-1 bg-[#111111]" />
                    </div>
                    <div className="space-y-0.5">
                      {filtered.map(m => {
                        const sel = selectedModels.includes(m.id)
                        return (
                          <div key={m.id} onClick={() => toggleSelect(m.id)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all border-2 ${
                              sel ? 'bg-[#ff3d81]/10 border-[#ff3d81]' : 'hover:bg-[#fdf9f0] border-transparent hover:border-[#111111]'
                            }`}>
                            <div className={`w-4 h-4 rounded border-2 border-[#111111] flex items-center justify-center shrink-0 transition-all ${
                              sel ? 'bg-[#ff3d81]' : 'bg-white'}`}>
                              {sel && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                <path d="M5 13l4 4L19 7" />
                              </svg>}
                            </div>
                            <span className="text-xs mono-brutal text-[#111111] font-bold flex-1">{m.id}</span>
                            {!m.enabled && <span className="text-[8px] mono-brutal text-[#ff6b5e] font-bold">disabled</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="px-5 py-3 border-t-2 border-[#111111] flex items-center justify-between shrink-0 bg-[#f0f0f0]">
              <span className="text-[10px] mono-brutal text-gray-500 font-bold">{selectedModels.length} selected</span>
              <button onClick={() => setShowPicker(false)}
                className="brutal-btn bg-[#ff3d81] text-white px-4 py-2 text-xs font-bold">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
