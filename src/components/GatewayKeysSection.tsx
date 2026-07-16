import { useState } from 'react'
import ModelPickerModal from './ModelPickerModal'

import { apiFetch } from '../api'

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
  const [editingKey, setEditingKey] = useState('')
  const [editLabel, setEditLabel] = useState('')
  const [editAccess, setEditAccess] = useState('full')
  const [editMaxTokens, setEditMaxTokens] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [allModels, setAllModels] = useState<Record<string, {id:string;enabled:boolean}[]>>({})

  const createKey = async () => {
    setCreating(true)
    try {
      const r = await apiFetch('/gateway_keys', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label || null, access_type: accessType, allowed_models: accessType === 'full' ? undefined : modelList, max_tokens: maxTokens ? parseInt(maxTokens) : undefined }),
      })
      const data = await r.json()
      if (data.success) { setCopied(data.key_value || ''); setLabel(''); setAccessType('full'); setModelList([]); setMaxTokens(''); onRefresh() }
    } catch { /* noop */ }
    setCreating(false)
  }

  const deleteKey = async (id: string) => { await apiFetch(`/gateway_keys/${id}`, { method: 'DELETE' }); onRefresh() }

  const saveKeyEdit = async (id: string) => {
    await apiFetch(`/gateway_keys/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: editLabel || null,
        access_type: editAccess,
        max_tokens: editMaxTokens ? parseInt(editMaxTokens) : 0,
        is_active: editActive,
      }),
    })
    setEditingKey(''); onRefresh()
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1e]/60 backdrop-blur-xl overflow-hidden"
      style={{ boxShadow: 'inset 0 1px 0 rgba(6,182,212,0.06), 0 0 20px rgba(6,182,212,0.03)' }}>
      <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
        <div>
          <h2 className="text-xs font-mono font-bold text-cyan-400 tracking-wider"
            style={{ textShadow: '0 0 10px rgba(6,182,212,0.3)' }}>GATEWAY KEYS</h2>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5">{keys.length} key{keys.length !== 1 ? 's' : ''} · API access tokens</p>
        </div>
        {keys.length > 0 && (
          <span className="text-[10px] font-mono text-slate-600">{keys.filter(k => k.is_active).length} active</span>
        )}
      </div>

      {/* Create form */}
      <div className="p-5 border-b border-white/[0.04] bg-black/20">
        <div className="text-[10px] font-mono font-semibold text-slate-400 mb-3 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
          Generate New Key
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
          <div>
            <div className="text-[9px] font-mono text-slate-500 mb-1.5 uppercase tracking-wide">Label</div>
            <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. production"
              className="w-full bg-black/50 border border-white/[0.08] rounded-lg px-3 py-2.5 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all"
              style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }} />
          </div>
          <div>
            <div className="text-[9px] font-mono text-slate-500 mb-1.5 uppercase tracking-wide">Access Type</div>
            <div className="flex bg-black/50 rounded-lg p-0.5 border border-white/[0.06]" style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }}>
              {['full','allow','deny'].map(t => (
                <button key={t} onClick={() => setAccessType(t)}
                  className={`flex-1 py-2 rounded-md text-[10px] font-mono font-semibold transition-all ${
                    accessType === t
                      ? t === 'full' ? 'bg-emerald-500/20 text-emerald-400'
                      : t === 'allow' ? 'bg-cyan-500/20 text-cyan-400'
                      : 'bg-red-500/20 text-red-400'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}>{t === 'full' ? 'Full' : t === 'allow' ? 'Allow' : 'Deny'}</button>
              ))}
            </div>
          </div>
          {accessType !== 'full' ? (
            <div>
              <div className="text-[9px] font-mono text-slate-500 mb-1.5 uppercase tracking-wide">Models</div>
              <button onClick={() => { apiFetch('/models/all').then(r => r.json()).then(data => { setAllModels(data); setShowPicker(true) }).catch(() => {}) }}
                className="w-full bg-black/50 border border-white/[0.08] rounded-lg px-3 py-2.5 text-[11px] font-mono text-left hover:border-cyan-500/40 transition-all"
                style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }}>
                {modelList.length === 0 ? <span className="text-slate-600">Select models...</span> : <span className="text-cyan-400">{modelList.length} selected</span>}
              </button>
              {modelList.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {modelList.slice(0, 3).map(mid => (
                    <span key={mid} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/15">
                      {mid.slice(0,18)}{mid.length>18?'…':''}
                      <button onClick={() => setModelList(prev => prev.filter(m => m !== mid))} className="text-cyan-500/70 hover:text-red-400 ml-0.5">×</button>
                    </span>
                  ))}
                  {modelList.length > 3 && <span className="text-[9px] font-mono text-slate-500">+{modelList.length-3} more</span>}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="text-[9px] font-mono text-slate-500 mb-1.5 uppercase tracking-wide">Max Tokens</div>
              <input type="number" value={maxTokens} onChange={e => setMaxTokens(e.target.value)} placeholder="0 = unlimited"
                className="w-full bg-black/50 border border-white/[0.08] rounded-lg px-3 py-2.5 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all"
                style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }} />
            </div>
          )}
          <div className="flex items-end">
            <button onClick={createKey} disabled={creating}
              className="w-full py-2.5 rounded-lg text-[11px] font-mono font-semibold bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/50 hover:from-cyan-500/30 hover:to-cyan-600/20 transition-all disabled:opacity-40"
              style={{ boxShadow: '0 0 12px rgba(6,182,212,0.15)' }}>
              {creating ? 'Creating...' : 'Generate Key'}
            </button>
          </div>
        </div>
        {accessType !== 'full' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] font-mono text-slate-500 mb-1.5 uppercase tracking-wide">Max Tokens</div>
              <input type="number" value={maxTokens} onChange={e => setMaxTokens(e.target.value)} placeholder="0 = unlimited"
                className="w-full bg-black/50 border border-white/[0.08] rounded-lg px-3 py-2.5 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all"
                style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }} />
            </div>
          </div>
        )}
        {copied && (
          <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 border border-emerald-500/20"
            style={{ boxShadow: '0 0 20px rgba(52,211,153,0.08)' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-400 tracking-wider">KEY GENERATED — COPY & SAVE NOW</span>
            </div>
            <code className="text-xs font-mono text-emerald-200 bg-black/60 rounded-lg p-3 block break-all border border-emerald-500/10"
              style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)' }}>{copied}</code>
            <p className="text-[9px] font-mono text-emerald-600 mt-2">This key won't be shown again.</p>
          </div>
        )}
      </div>

      {/* Key list */}
      <div className="divide-y divide-white/[0.04]">
        {keys.map(k => {
          const createdAt = new Date(k.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          return (
            <div key={k.id} className="px-5 py-4 hover:bg-white/[0.02] transition-all group">
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${k.is_active ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      style={k.is_active ? { boxShadow: '0 0 8px rgba(52,211,153,0.5)' } : {}} />
                    <span className="text-sm font-mono font-semibold text-slate-200">{k.label || 'unnamed'}</span>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                      k.access_type === 'full' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400/80' :
                      k.access_type === 'allow' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400/80' :
                      'bg-red-500/10 border-red-500/20 text-red-400/80'
                    }`}>
                      {k.access_type === 'full' ? 'All models' : k.access_type === 'allow' ? `${k.allowed_models?.length || 0} whitelisted` : `${k.allowed_models?.length || 0} blacklisted`}
                    </span>
                    {k.max_tokens > 0 && (
                      <span className="text-[9px] font-mono text-slate-500 bg-slate-500/10 px-2 py-0.5 rounded-full border border-slate-500/15">
                        {k.max_tokens >= 1e12 ? (k.max_tokens/1e12).toFixed(1)+'T' : k.max_tokens >= 1e9 ? (k.max_tokens/1e9).toFixed(1)+'B' : k.max_tokens >= 1e6 ? (k.max_tokens/1e6).toFixed(1)+'M' : k.max_tokens >= 1e3 ? (k.max_tokens/1e3).toFixed(1)+'K' : k.max_tokens} tok
                      </span>
                    )}
                  </div>
                  <code className="text-[11px] font-mono text-slate-500 block mb-1.5 bg-black/30 rounded-lg px-3 py-2 border border-white/[0.04] break-all max-w-full overflow-x-hidden"
                    style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)' }}>
                    {k.key_value}
                  </code>
                  <div className="flex items-center gap-4 text-[9px] font-mono text-slate-600">
                    <span>ID: {k.id.slice(0,12)}...</span>
                    <span>Created: {createdAt}</span>
                  </div>
                  {editingKey === k.id && (
                    <div className="mt-3 p-4 rounded-xl bg-black/30 border border-cyan-500/20"
                      style={{ boxShadow: '0 0 15px rgba(6,182,212,0.06)' }}>
                      <div className="text-[9px] font-mono text-cyan-400/70 uppercase tracking-wide mb-3">Edit Key</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        <div>
                          <div className="text-[8px] font-mono text-slate-500 mb-1 uppercase">Label</div>
                          <input type="text" value={editLabel} onChange={e => setEditLabel(e.target.value)} placeholder={k.label || 'Label...'}
                            className="w-full bg-black/50 border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40"
                            style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }} autoFocus />
                        </div>
                        <div>
                          <div className="text-[8px] font-mono text-slate-500 mb-1 uppercase">Access</div>
                          <div className="flex bg-black/50 rounded-lg p-0.5 border border-white/[0.06]">
                            {['full','allow','deny'].map(t => (
                              <button key={t} onClick={() => setEditAccess(t)}
                                className={`flex-1 py-1.5 rounded text-[9px] font-mono font-semibold transition-all ${
                                  editAccess === t
                                    ? t === 'full' ? 'bg-emerald-500/20 text-emerald-400' : t === 'allow' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-red-500/20 text-red-400'
                                    : 'text-slate-500 hover:text-slate-300'
                                }`}>{t === 'full' ? 'Full' : t === 'allow' ? 'Allow' : 'Deny'}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-[8px] font-mono text-slate-500 mb-1 uppercase">Max Tokens</div>
                          <input type="number" value={editMaxTokens} onChange={e => setEditMaxTokens(e.target.value)} placeholder="0 = unlimited"
                            className="w-full bg-black/50 border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40"
                            style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={editActive} onChange={e => setEditActive(e.target.checked)}
                            className="w-3.5 h-3.5 rounded bg-black/50 border-white/[0.15] accent-cyan-500" />
                          <span className="text-[9px] font-mono text-slate-400">Active</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditingKey('')} className="px-3 py-2 rounded-lg text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-all">Cancel</button>
                          <button onClick={() => saveKeyEdit(k.id)} className="px-4 py-2 rounded-lg text-[10px] font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 transition-all">Save Changes</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => { setEditingKey(k.id === editingKey ? '' : k.id); setEditLabel(k.label || ''); setEditAccess(k.access_type || 'full'); setEditMaxTokens(k.max_tokens > 0 ? String(k.max_tokens) : ''); setEditActive(k.is_active === 1) }}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all shrink-0 border ${
                      k.id === editingKey ? 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20' : 'text-slate-600 hover:text-cyan-300 hover:bg-cyan-500/10 border-transparent hover:border-cyan-500/20'
                    } opacity-50 group-hover:opacity-100`}
                    title="Edit key">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </button>
                  <button onClick={() => deleteKey(k.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0 border border-transparent hover:border-red-500/20 opacity-50 group-hover:opacity-100"
                    title="Delete key">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {keys.length === 0 && (
          <div className="px-5 py-16 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-cyan-500/40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
            </div>
            <div className="text-xs font-mono font-semibold text-slate-400 mb-1">No Gateway Keys</div>
            <p className="text-[10px] font-mono text-slate-600">Generate one above to access the API</p>
          </div>
        )}
      </div>

      <ModelPickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        allModels={allModels}
        selected={modelList}
        onToggle={(mid: string) => setModelList(prev => prev.includes(mid) ? prev.filter(m => m !== mid) : [...prev, mid])}
      />
    </div>
  )
}
