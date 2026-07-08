import { useState } from 'react'
import ModelPickerModal from './ModelPickerModal'

interface GatewayKeyJson {
  id: string; key_value: string; label: string | null; is_active: number
  access_type: string; allowed_models: string[]; max_tokens: number; created_at: string
}

interface Props {
  keys: GatewayKeyJson[]
  onRefresh: () => void
}

export default function GatewayKeysSection({ keys, onRefresh }: Props) {
  const [label, setLabel] = useState('')
  const [accessType, setAccessType] = useState('full')
  const [modelList, setModelList] = useState<string[]>([])
  const [maxTokens, setMaxTokens] = useState('')
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [allModels, setAllModels] = useState<Record<string, {id:string;enabled:boolean}[]>>({})

  const createKey = async () => {
    setCreating(true)
    try {
      const r = await fetch('/admin/api/gateway_keys', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label || null, access_type: accessType, allowed_models: accessType === 'full' ? undefined : modelList, max_tokens: maxTokens ? parseInt(maxTokens) : undefined }),
      })
      const data = await r.json()
      if (data.success) { setCopied(data.key_value || ''); setLabel(''); setAccessType('full'); setModelList([]); setMaxTokens(''); onRefresh() }
    } catch (_) {}
    setCreating(false)
  }

  const deleteKey = async (id: string) => { await fetch(`/admin/api/gateway_keys/${id}`, { method: 'DELETE' }); onRefresh() }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1e]/60 backdrop-blur-xl overflow-hidden"
      style={{ boxShadow: 'inset 0 1px 0 rgba(6,182,212,0.06)' }}>
      <div className="px-5 py-4 border-b border-white/[0.04]">
        <h2 className="text-xs font-mono font-bold text-cyan-400 tracking-wider"
          style={{ textShadow: '0 0 10px rgba(6,182,212,0.3)' }}>GATEWAY KEYS</h2>
      </div>

      {/* Create form */}
      <div className="p-5 border-b border-white/[0.04]">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[120px]">
            <div className="text-[9px] font-mono text-slate-600 mb-1">Label</div>
            <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. production"
              className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40" />
          </div>
          <div>
            <div className="text-[9px] font-mono text-slate-600 mb-1">Access</div>
            <div className="flex gap-1">
              {['full','allow','deny'].map(t => (
                <button key={t} onClick={() => setAccessType(t)}
                  className={`px-3 py-2 rounded-lg text-[10px] font-mono font-semibold border transition-all ${
                    accessType === t
                      ? t === 'full' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : t === 'allow' ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                      : 'bg-red-500/15 border-red-500/40 text-red-400'
                      : 'bg-black/40 border-white/[0.06] text-slate-500 hover:border-white/[0.12]'
                  }`}>{t === 'full' ? 'Full' : t === 'allow' ? 'Allow' : 'Deny'}</button>
              ))}
            </div>
          </div>
          {accessType !== 'full' && (
            <div className="flex-1 min-w-[160px]">
              <div className="text-[9px] font-mono text-slate-600 mb-1">Models</div>
              <button onClick={() => { fetch('/admin/api/models/all').then(r => r.json()).then(data => { setAllModels(data); setShowPicker(true) }).catch(() => {}) }}
                className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] font-mono text-slate-200 hover:border-cyan-500/40 transition-all text-left">
                {modelList.length === 0 ? <span className="text-slate-600">Select models...</span> : <span className="text-cyan-400">{modelList.length} models selected</span>}
              </button>
              {modelList.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {modelList.map(mid => (
                    <span key={mid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-mono text-cyan-300">
                      {mid}<button onClick={() => setModelList(prev => prev.filter(m => m !== mid))} className="text-cyan-500 hover:text-red-400">✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="w-24">
            <div className="text-[9px] font-mono text-slate-600 mb-1">Max Tokens</div>
            <input type="number" value={maxTokens} onChange={e => setMaxTokens(e.target.value)} placeholder="0 = ∞"
              className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40" />
          </div>
          <button onClick={createKey} disabled={creating}
            className="px-4 py-2 rounded-lg text-[11px] font-mono font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all disabled:opacity-40 whitespace-nowrap">
            {creating ? 'Creating...' : 'Generate Key'}
          </button>
        </div>
        {copied && (
          <div className="mt-3 p-3 rounded-lg bg-black/40 border border-emerald-500/20">
            <div className="text-[9px] font-mono text-emerald-400/80 mb-1">Key created! Copy it now:</div>
            <code className="text-[10px] font-mono text-slate-300 break-all bg-black/60 rounded p-2 block">{copied}</code>
          </div>
        )}
      </div>

      {/* Key list */}
      <div className="divide-y divide-white/[0.04]">
        {keys.map(k => (
          <div key={k.id} className="px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={`w-2 h-2 rounded-full ${k.is_active ? 'bg-emerald-500' : 'bg-slate-700'}`}
                style={k.is_active ? { boxShadow: '0 0 6px rgba(52,211,153,0.5)' } : {}} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-semibold text-slate-200">{k.label || 'unnamed'}</span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                    k.access_type === 'full' ? 'bg-emerald-500/10 text-emerald-400/80' : k.access_type === 'allow' ? 'bg-cyan-500/10 text-cyan-400/80' : 'bg-red-500/10 text-red-400/80'
                  }`}>{k.access_type}</span>
                  {k.allowed_models.length > 0 && <span className="text-[8px] font-mono text-slate-600">{k.allowed_models.length} models</span>}
                  {k.max_tokens > 0 && <span className="text-[8px] font-mono text-slate-600">{k.max_tokens >= 1e12 ? (k.max_tokens/1e12).toFixed(1)+'T' : k.max_tokens >= 1e9 ? (k.max_tokens/1e9).toFixed(1)+'B' : k.max_tokens >= 1e6 ? (k.max_tokens/1e6).toFixed(1)+'M' : k.max_tokens >= 1e3 ? (k.max_tokens/1e3).toFixed(1)+'K' : k.max_tokens} tok</span>}
                </div>
                <code className="text-[9px] font-mono text-slate-500 block truncate">{k.key_value}</code>
              </div>
            </div>
            <button onClick={() => deleteKey(k.id)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0 ml-3">✕</button>
          </div>
        ))}
        {keys.length === 0 && <div className="px-5 py-8 text-center text-[10px] font-mono text-slate-600">No gateway keys yet.</div>}
      </div>

      <ModelPickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        allModels={allModels}
        selected={modelList}
        onToggle={(mid) => setModelList(prev => prev.includes(mid) ? prev.filter(m => m !== mid) : [...prev, mid])}
      />
    </div>
  )
}
