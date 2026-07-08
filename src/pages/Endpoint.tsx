import { useEffect, useState } from 'react'
import { getSettings, getGatewayKeys, createGatewayKey, deleteGatewayKey, toggleSetting } from '../api'
import type { SettingsData, GatewayKey } from '../api'

function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text))
  }
  return fallbackCopy(text)
}

function fallbackCopy(text: string): Promise<boolean> {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try {
    document.execCommand('copy')
    return Promise.resolve(true)
  } catch {
    return Promise.resolve(false)
  } finally {
    document.body.removeChild(ta)
  }
}

const cavemanLevels = [
  { key: 'off', label: 'OFF' },
  { key: 'lite', label: 'LITE' },
  { key: 'full', label: 'FULL' },
  { key: 'ultra', label: 'ULTRA' },
]

const envGatewayUrl = import.meta.env.VITE_GATEWAY_BACKEND_URL

export default function Endpoint() {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [keys, setKeys] = useState<GatewayKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [newKeyLabel, setNewKeyLabel] = useState('')
  const [newKeyResult, setNewKeyResult] = useState<{ key_value: string; id: string } | null>(null)
  const [copiedId, setCopiedId] = useState('')
  const [deleting, setDeleting] = useState('')

  const loadSettings = () =>
    Promise.all([getSettings(), getGatewayKeys()])
      .then(([s, k]) => { setSettings(s); setKeys(k) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))

  useEffect(() => { loadSettings() }, [])

  const handleToggle = async (key: string, value: string) => {
    try {
      await toggleSetting(key, value)
      const s = await getSettings()
      setSettings(s)
    } catch (e: any) {
      setError(e.message)
    }
  }

  const gatewayUrl = envGatewayUrl
    ? `${envGatewayUrl.replace(/\/+$/, '')}/v1`
    : settings
      ? `http://${settings.public_ip}:${settings.port}/v1`
      : ''

  const claudeUrl = envGatewayUrl
    ? envGatewayUrl.replace(/\/+$/, '')
    : settings
      ? `http://${settings.public_ip}:${settings.port}`
      : ''

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await createGatewayKey(newKeyLabel || 'default')
      if (res.key_value && res.id) {
        setNewKeyResult({ key_value: res.key_value, id: res.id })
        setKeys(prev => [...prev, {
          id: res.id!, key_value: res.key_value!, label: newKeyLabel || null,
          is_active: 1, created_at: new Date().toISOString(),
        }])
        setNewKeyLabel('')
      }
    } catch (e: any) {
      setError(e.message)
    }
    setCreating(false)
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await deleteGatewayKey(id)
      setKeys(prev => prev.filter(k => k.id !== id))
      if (newKeyResult?.id === id) setNewKeyResult(null)
    } catch (e: any) {
      setError(e.message)
    }
    setDeleting('')
  }

  const copy = async (val: string, id: string) => {
    const ok = await copyToClipboard(val)
    setCopiedId(ok ? id : 'fail')
    setTimeout(() => setCopiedId(''), 1500)
  }

  const maskKey = (k: string) => {
    if (k.length <= 8) return k
    return k.slice(0, 4) + '•'.repeat(12) + k.slice(-4)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-xs font-mono text-slate-500 animate-pulse">LOADING...</div>
    </div>
  )

  if (error) return (
    <div className="border border-red-900/50 rounded-xl p-6 text-center bg-red-950/10">
      <div className="text-red-400 font-mono text-xs">ERROR: {error}</div>
    </div>
  )

  return (
    <div className="relative">
      <div className="space-y-5">
        <div className="mb-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent"
            style={{ textShadow: '0 0 30px rgba(6,182,212,0.3)' }}>
            ENDPOINT
          </h1>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5">Gateway configuration &amp; access</p>
        </div>

        {/* Gateway URL — OpenAI */}
        <div className="border border-white/[0.06] rounded-xl bg-[#0a0f1e]/60 backdrop-blur-xl overflow-hidden"
          style={{ boxShadow: 'inset 0 1px 0 rgba(6,182,212,0.06), 0 0 20px rgba(6,182,212,0.03)' }}>
          <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold text-[#19C37D] tracking-wider"
              style={{ textShadow: '0 0 10px rgba(25,195,125,0.3)' }}>OPENAI_URL</h2>
            <span className="text-[10px] font-mono text-slate-500">/v1/chat/completions</span>
          </div>
          <div className="px-5 py-4">
            {gatewayUrl ? (
              <div className="flex items-center gap-3">
                <code className="flex-1 text-sm font-mono text-slate-200 bg-black/40 rounded-lg px-4 py-2.5 border border-white/[0.06] truncate"
                  style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }}>
                  {gatewayUrl}
                </code>
                <button
                  onClick={() => copy(gatewayUrl, '__url__')}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-[11px] font-mono font-semibold transition-all whitespace-nowrap border ${
                    copiedId === '__url__'
                      ? 'text-green-300 bg-green-500/10 border-green-500/30'
                      : copiedId === 'fail'
                      ? 'text-red-300 bg-red-500/10 border-red-500/30'
                      : 'text-[#19C37D] bg-[#19C37D]/10 border-[#19C37D]/20 hover:bg-[#19C37D]/20'
                  }`}
                  style={copiedId === '__url__' ? { boxShadow: '0 0 10px rgba(52,211,153,0.2)' } : {}}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d={copiedId === '__url__'
                      ? 'M5 13l4 4L19 7'
                      : 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'
                    } />
                  </svg>
                  {copiedId === '__url__' ? 'Copied!' : copiedId === 'fail' ? 'Failed' : 'Copy'}
                </button>
              </div>
            ) : (
              <div className="text-xs font-mono text-slate-600">Set VITE_GATEWAY_BACKEND_URL in .env or wait for settings...</div>
            )}
          </div>
        </div>

        {/* Gateway URL — Anthropic */}
        <div className="border border-white/[0.06] rounded-xl bg-[#0a0f1e]/40 overflow-hidden opacity-40">
          <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold text-[#D97757] tracking-wider">ANTHROPIC_URL</h2>
            <span className="text-[10px] font-mono text-slate-500">COMING SOON</span>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center gap-3">
              <code className="flex-1 text-sm font-mono text-slate-600 bg-black/30 rounded-lg px-4 py-2.5 border border-white/[0.06] line-through decoration-slate-600 truncate">
                {claudeUrl || 'http://ip:port'}
              </code>
              <button disabled className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-[11px] font-mono font-semibold text-slate-600 bg-slate-500/5 border border-slate-700/30 cursor-not-allowed">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Not Available
              </button>
            </div>
          </div>
        </div>

        {/* TOKEN_SAVER */}
        {settings && (
          <div className="border border-white/[0.06] rounded-xl bg-[#0a0f1e]/60 backdrop-blur-xl overflow-hidden"
            style={{ boxShadow: 'inset 0 1px 0 rgba(6,182,212,0.06), 0 0 20px rgba(6,182,212,0.03)' }}>
            <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between">
              <h2 className="text-xs font-mono font-bold text-cyan-400 tracking-wider"
                style={{ textShadow: '0 0 10px rgba(6,182,212,0.3)' }}>TOKEN_SAVER</h2>
              <span className="text-[10px] font-mono text-slate-500">Optimize token usage</span>
            </div>
            <div className="p-4 space-y-2">
              {/* RTK */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-black/40 border border-white/[0.04] opacity-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M8 5V3h8v2" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-slate-300">RTK</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-slate-500/15 text-slate-500 border border-slate-500/20">SOON</span>
                    </div>
                    <p className="text-[10px] font-mono text-slate-600 mt-0.5 truncate max-w-[220px] sm:max-w-sm">Compress tool output — fewer input tokens</p>
                  </div>
                </div>
              </div>

              {/* Headroom */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-black/40 border border-white/[0.04] opacity-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-slate-300">Headroom</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-slate-500/15 text-slate-500 border border-slate-500/20">SOON</span>
                    </div>
                    <p className="text-[10px] font-mono text-slate-600 mt-0.5 truncate max-w-[220px] sm:max-w-sm">Compress prompts before routing</p>
                  </div>
                </div>
              </div>

              {/* Caveman */}
              <div className="px-4 py-3 rounded-xl bg-black/40 border border-white/[0.06] hover:border-cyan-500/30 transition-all"
                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/10"
                      style={{ boxShadow: '0 0 10px rgba(6,182,212,0.15)' }}>
                      <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-slate-200">Caveman</span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md border ${
                          settings.caveman_enabled !== 'off'
                            ? 'bg-purple-500/15 text-purple-300 border-purple-500/25'
                            : 'bg-slate-500/15 text-slate-500 border-slate-500/20'
                        }`}>
                          {settings.caveman_enabled === 'off' ? 'OFF' : settings.caveman_enabled.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-slate-600 mt-0.5 truncate max-w-[180px] sm:max-w-xs">Terse LLM output ~65% fewer tokens</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {cavemanLevels.map(lv => {
                    const active = settings.caveman_enabled === lv.key
                    return (
                      <button
                        key={lv.key}
                        onClick={() => handleToggle('caveman_enabled', lv.key)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold tracking-wide transition-all ${
                          active
                            ? 'bg-gradient-to-br from-purple-500/20 to-purple-600/10 text-purple-300 border border-purple-500/40'
                            : 'bg-slate-800/40 text-slate-500 border border-slate-700/40 hover:border-purple-500/30 hover:text-slate-300'
                        }`}
                        style={active ? { boxShadow: '0 0 12px rgba(168,85,247,0.2)' } : {}}
                      >
                        {lv.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Ponytail */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-black/40 border border-white/[0.04] opacity-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-slate-300">Ponytail</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-slate-500/15 text-slate-500 border border-slate-500/20">SOON</span>
                    </div>
                    <p className="text-[10px] font-mono text-slate-600 mt-0.5 truncate max-w-[220px] sm:max-w-sm">Alternative terse style</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gateway Keys */}
        <div className="border border-white/[0.06] rounded-xl bg-[#0a0f1e]/60 backdrop-blur-xl overflow-hidden"
          style={{ boxShadow: 'inset 0 1px 0 rgba(6,182,212,0.06), 0 0 20px rgba(6,182,212,0.03)' }}>
          <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold text-cyan-400 tracking-wider"
              style={{ textShadow: '0 0 10px rgba(6,182,212,0.3)' }}>GATEWAY_KEYS</h2>
            <span className="text-[10px] font-mono text-slate-500">{keys.length} key{keys.length !== 1 ? 's' : ''}</span>
          </div>

          {newKeyResult && (
            <div className="mx-5 mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30"
              style={{ boxShadow: '0 0 15px rgba(245,158,11,0.1)' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono font-bold text-amber-400 tracking-wider">KEY CREATED — COPY NOW</span>
                <button onClick={() => setNewKeyResult(null)} className="text-[10px] text-amber-500 hover:text-amber-300 transition-colors">Dismiss</button>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono text-amber-200 bg-black/40 rounded px-3 py-2 truncate">
                  {newKeyResult.key_value}
                </code>
                <button onClick={() => copy(newKeyResult.key_value, 'new_key')}
                  className={`px-2.5 py-1.5 rounded text-[10px] font-mono font-semibold transition-all ${
                    copiedId === 'new_key' ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                  }`}>
                  {copiedId === 'new_key' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          <div className="p-5 space-y-2">
            {keys.length === 0 ? (
              <div className="text-center py-8 text-[11px] font-mono text-slate-600">No gateway keys yet. Create one below.</div>
            ) : (
              keys.map(k => (
                <div key={k.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-black/40 border border-white/[0.04] hover:border-cyan-500/20 transition-all group"
                  style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)' }}>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${k.is_active ? 'bg-emerald-500' : 'bg-slate-600'}`}
                    style={k.is_active ? { boxShadow: '0 0 6px rgba(52,211,153,0.5)' } : {}} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {k.label && <span className="text-[11px] font-mono font-semibold text-slate-300">{k.label}</span>}
                      <span className="text-[10px] font-mono text-slate-600">
                        {new Date(k.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    <code className="text-xs font-mono text-slate-500 truncate block">
                      {k.id === newKeyResult?.id ? newKeyResult.key_value : maskKey(k.key_value)}
                    </code>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => copy(k.key_value, k.id)}
                      className={`w-7 h-7 flex items-center justify-center rounded-md transition-all ${
                        copiedId === k.id ? 'text-green-400 bg-green-500/15' : 'text-slate-500 hover:text-cyan-300 hover:bg-cyan-500/10'
                      }`}
                      style={copiedId === k.id ? { boxShadow: '0 0 8px rgba(52,211,153,0.3)' } : {}}
                      title="Copy key">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d={copiedId === k.id ? 'M5 13l4 4L19 7' : 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'} />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(k.id)} disabled={deleting === k.id}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-30"
                      title="Delete key">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d={deleting === k.id ? 'M12 4v16m8-8H4' : 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'} />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-5 pb-5">
            <div className="flex items-center gap-2">
              <input type="text" value={newKeyLabel} onChange={e => setNewKeyLabel(e.target.value)}
                placeholder="Key label (optional)"
                className="flex-1 bg-black/50 border border-white/[0.08] rounded-lg px-3.5 py-2 text-xs font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all"
                style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }}
                onKeyDown={e => e.key === 'Enter' && newKeyLabel !== '' && handleCreate()} />
              <button onClick={handleCreate} disabled={creating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-mono font-semibold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-all disabled:opacity-40 whitespace-nowrap"
                style={{ boxShadow: '0 0 10px rgba(6,182,212,0.1)' }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 4v16m8-8H4" />
                </svg>
                {creating ? 'Creating...' : 'New Key'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
