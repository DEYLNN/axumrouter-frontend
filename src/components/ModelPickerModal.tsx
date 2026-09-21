import { useState } from 'react'
import Modal from './Modal'

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

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-lg">
      <div className="max-h-[75vh] overflow-hidden flex flex-col -m-6">
        <div className="px-5 py-3.5 border-b-2 border-line flex items-center justify-between shrink-0">
          <h2 className="heading-brutal text-sm uppercase tracking-tight">Select Models</h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-subtext hover:text-ink hover:bg-muted transition-all border-2 border-transparent hover:border-line">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-3 border-b-2 border-line shrink-0">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search models..."
            className="w-full px-3 py-2 border-2 border-line rounded-lg text-xs mono-brutal text-ink bg-surface placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff3d81]" />
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {Object.entries(allModels).map(([provId, models]) => {
            const filtered = models.filter(m => !search || m.id.toLowerCase().includes(search.toLowerCase()))
            if (filtered.length === 0) return null
            return (
              <div key={provId}>
                <div className="text-[9px] mono-brutal font-bold text-subtext uppercase tracking-wider mb-2">{provId}</div>
                <div className="space-y-0.5">
                  {filtered.map(m => {
                    const sel = selected.includes(m.id)
                    return (
                      <div key={m.id} onClick={() => onToggle(m.id)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all border-2 ${
                          sel ? 'bg-[#c8a2ff]/15 border-[#c8a2ff]' : 'border-transparent hover:bg-muted'
                        }`}>
                        <div className={`w-4 h-4 rounded border-2 border-line flex items-center justify-center shrink-0 transition-all ${sel ? 'bg-[#c8a2ff]' : 'bg-surface'}`}>
                          {sel && (
                            <svg className="w-3 h-3 text-ink" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs mono-brutal text-ink flex-1 truncate">{m.id}</span>
                        {!m.enabled && <span className="text-[8px] mono-brutal text-[#ff6b5e] shrink-0 font-bold">disabled</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        <div className="px-5 py-3 border-t-2 border-line flex items-center justify-between shrink-0 bg-surface">
          <span className="text-[10px] mono-brutal text-subtext font-bold">{selected.length} selected</span>
          <button onClick={onClose}
            className="brutal-btn bg-[#c8a2ff] text-on-accent px-4 py-2 text-[11px] font-bold">Done</button>
        </div>
      </div>
    </Modal>
  )
}
