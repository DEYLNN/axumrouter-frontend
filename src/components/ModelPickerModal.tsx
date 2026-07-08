import { useState } from 'react'

interface ModelItem { id: string; enabled: boolean }

interface Props {
  open: boolean
  onClose: () => void
  allModels: Record<string, ModelItem[]>
  selected: string[]
  onToggle: (modelId: string) => void
}

export default function ModelPickerModal({ open, onClose, allModels, selected, onToggle }: Props) {
  const [search, setSearch] = useState('')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}>
      <div className="w-full max-w-lg mx-4 max-h-[75vh] rounded-2xl border border-white/[0.06] bg-[#0a0f1e] backdrop-blur-xl overflow-hidden flex flex-col"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between shrink-0">
          <h2 className="text-xs font-mono font-bold text-slate-200">Select Models</h2>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-3 border-b border-white/[0.04] shrink-0">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search models..."
            className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40" />
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {Object.entries(allModels).map(([provId, models]) => {
            const filtered = models.filter(m => !search || m.id.toLowerCase().includes(search.toLowerCase()))
            if (filtered.length === 0) return null
            return (
              <div key={provId}>
                <div className="text-[9px] font-mono font-semibold text-slate-500 uppercase tracking-wider mb-2">{provId}</div>
                <div className="space-y-0.5">
                  {filtered.map(m => {
                    const sel = selected.includes(m.id)
                    return (
                      <div key={m.id} onClick={() => onToggle(m.id)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                          sel ? 'bg-cyan-500/10 border border-cyan-500/20' : 'hover:bg-white/[0.03] border border-transparent'
                        }`}>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                          sel ? 'bg-cyan-400 border-cyan-400' : 'border-slate-600'
                        }`}>
                          {sel && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs font-mono text-slate-300 flex-1 truncate">{m.id}</span>
                        {!m.enabled && <span className="text-[8px] font-mono text-red-400/50 shrink-0">disabled</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        <div className="px-5 py-3 border-t border-white/[0.04] flex items-center justify-between shrink-0 bg-[#0a0f1e]">
          <span className="text-[10px] font-mono text-slate-500">{selected.length} selected</span>
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-[11px] font-mono font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all">Done</button>
        </div>
      </div>
    </div>
  )
}
