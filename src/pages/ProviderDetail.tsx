import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { startOAuth, exchangeOAuth, getProviderDetail, blockModel, unblockModel, addKey, deleteKey, testModel } from '../api'
import type { ProviderDetail as ProviderDetailType } from '../api'

const typeLabel: Record<string, string> = {
  apikey: 'API Key',
  oauth: 'OAuth',
  custom: 'Custom',
}

export default function ProviderDetail() {
  const { id } = useParams()
  const [data, setData] = useState<ProviderDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState('')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingKey, setDeletingKey] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<any>(null)
  const [showOAuthModal, setShowOAuthModal] = useState(false)
  const [oauthUrl, setOauthUrl] = useState('')
  const [oauthSession, setOauthSession] = useState('')
  const [oauthCode, setOauthCode] = useState('')
  const [oauthConnecting, setOauthConnecting] = useState(false)
  const [oauthError, setOauthError] = useState('')
  const [oauthDone, setOauthDone] = useState(false)
  const [isDeviceCode, setIsDeviceCode] = useState(false)
  const [fbPolling, setFbPolling] = useState(false)
  const fbPollRef = useRef(false)

  const load = useCallback(() => {
    if (!id) return
    getProviderDetail(id)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  const handleToggle = async (modelId: string, currentlyBlocked: boolean) => {
    if (!id) return
    setToggling(modelId)
    try {
      if (currentlyBlocked) {
        await unblockModel(id, modelId)
      } else {
        await blockModel(id, modelId)
      }
      await load()
    } catch (e: any) {
      setError(e.message)
    }
    setToggling(null)
  }

  const copy = async (val: string) => {
    try {
      await navigator.clipboard.writeText(val)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = val
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopiedId(val)
    setTimeout(() => setCopiedId(''), 1800)
  }

  const handleAddKey = async () => {
    if (!id || !newKeyValue.trim()) return
    setAdding(true)
    try {
      const lines = newKeyValue.trim().split('\n').map(l => l.trim()).filter(Boolean)
      for (const line of lines) {
        const pipeIdx = line.indexOf('|')
        if (pipeIdx > -1) {
          const lbl = line.slice(0, pipeIdx).trim()
          const val = line.slice(pipeIdx + 1).trim()
          if (val) await addKey(id, val, lbl)
        } else {
          await addKey(id, line, '')
        }
      }
      setNewKeyValue('')
      await load()
    } catch (e: any) {
      setError(e.message)
    }
    setAdding(false)
  }

  const handleDeleteKey = async (keyId: string) => {
    if (!id) return
    setDeletingKey(keyId)
    try {
      await deleteKey(id, keyId)
      await load()
    } catch (e: any) {
      setError(e.message)
    }
    setDeletingKey('')
  }

  const handleOpenOAuth = async () => {
    if (!id) return
    setOauthError('')
    setOauthDone(false)
    setOauthCode('')
    setOauthConnecting(true)
    setIsDeviceCode(false)

    try {
      if (id === 'fb') {
        setIsDeviceCode(true)
        const res = await fetch('/admin/oauth/fb/start')
        if (!res.ok) throw new Error('OAuth start failed: ' + res.status)
        const data = await res.json()
        setOauthUrl(data.verification_uri_complete || data.login_url || '')
        setShowOAuthModal(true)
        window.open(data.verification_uri_complete || data.login_url, '_blank', 'noopener,noreferrer')
        // Start polling
        fbPollRef.current = true
        setFbPolling(true)
        startFbPoll(data)
      } else {
        const result = await startOAuth(id)
        setOauthUrl(result.url)
        setOauthSession(result.id)
        setShowOAuthModal(true)
      }
    } catch (e: any) {
      setOauthError(e.message)
    }
    setOauthConnecting(false)
  }

  const startFbPoll = (data: any) => {
    const interval = (data.interval || 4) * 1000
    let attempts = 0
    const maxAttempts = Math.floor(600 / (data.interval || 4))

    // First poll immediately
    const tick = async () => {
      if (!fbPollRef.current || attempts >= maxAttempts) {
        setFbPolling(false)
        if (attempts >= maxAttempts) setOauthError('Authorization timeout')
        return
      }
      attempts++
      try {
        const res = await fetch('/admin/oauth/fb/poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_code: data.device_code,
            fingerprint_hash: data.fingerprint_hash || null,
            expires_at: data.expires_at || null,
          }),
        })
        if (!res.ok) {
          // Backend error — retry
          setTimeout(tick, interval)
          return
        }
        const result = await res.json()
        if (!fbPollRef.current) return
        if (result.ok && result.access_token) {
          fbPollRef.current = false
          setFbPolling(false)
          setOauthDone(true)
          await load()
          return
        }
        if (result.error === 'expired_token' || result.error === 'access_denied') {
          fbPollRef.current = false
          setFbPolling(false)
          setOauthError('Link expired or already used. Close and try again.')
          return
        }
        // Any non-success: keep polling
        setTimeout(tick, interval)
      } catch (e: any) {
        if (!fbPollRef.current) return
        setTimeout(tick, interval)
      }
    }
    tick() // immediate first call
  }

  const handleOAuthExchange = async () => {
    if (!id || !oauthCode.trim()) return
    setOauthConnecting(true)
    setOauthError('')
    try {
      const result = await exchangeOAuth(id, oauthSession, oauthCode.trim())
      if (result.success) {
        setOauthDone(true)
        await load()
      } else {
        setOauthError(result.error || 'Exchange failed')
      }
    } catch (e: any) {
      setOauthError(e.message)
    }
    setOauthConnecting(false)
  }

  const handleTest = async (modelName: string) => {
    if (!id) return
    setTesting(modelName)
    setTestResult(null)
    try {
      const res = await testModel(id, modelName)
      setTestResult(res)
    } catch (e: any) {
      setTestResult({ ok: false, error: e.message, latency_ms: 0, prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, response: '' })
    }
    setTesting(null)
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

  if (!data) return null

  const label = typeLabel[data.type] || data.type

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link to="/admin/providers" className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-600 hover:text-slate-400 transition-colors mb-4">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5m7-7l-7 7 7 7" />
          </svg>
          Back to providers
        </Link>

        <div className="flex items-center gap-4">
          {data.icon_url ? (
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/[0.04] border border-white/[0.06]">
              <img src={data.icon_url} alt="" className="w-6 h-6 object-contain" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/[0.03] border border-white/[0.06]">
              <span className="text-lg font-semibold font-mono text-slate-500">{data.display_name.charAt(0)}</span>
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white tracking-tight">{data.display_name}</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-500">{data.id}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] font-mono text-slate-600">{label}</span>
              <span className="text-slate-700">·</span>
              <span className="text-[10px] font-mono text-slate-600">{data.capabilities?.length || 0} capabilities</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] p-4">
          <div className="text-[10px] font-mono text-slate-600 mb-1">ACTIVE</div>
          <div className="text-2xl font-semibold text-emerald-400">{data.active_keys}</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] p-4">
          <div className="text-[10px] font-mono text-slate-600 mb-1">TOTAL</div>
          <div className="text-2xl font-semibold text-slate-200">{data.total_keys}</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] p-4">
          <div className="text-[10px] font-mono text-slate-600 mb-1">LOCKED</div>
          <div className={`text-2xl font-semibold ${data.locked_keys > 0 ? 'text-red-400' : 'text-slate-600'}`}>{data.locked_keys}</div>
        </div>
      </div>

      {data.capabilities && data.capabilities.length > 0 && (
        <div className="rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] p-5">
          <h2 className="text-[10px] font-mono font-semibold uppercase tracking-[0.12em] text-slate-500 mb-3">Capabilities</h2>
          <div className="flex flex-wrap gap-2">
            {data.capabilities.map(c => (
              <span key={c} className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-400">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between">
          <h2 className="text-[10px] font-mono font-semibold uppercase tracking-[0.12em] text-slate-500">Models</h2>
          <span className="text-[10px] font-mono text-slate-600">{data.models.length}</span>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {data.models.map(m => (
            <div key={m.id} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.available && !m.blocked ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-200 truncate">{m.name}</div>
                  <div className="text-[9px] font-mono text-slate-600 truncate mt-0.5">{m.id}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                {data.keys.length > 0 && (
                <button onClick={() => handleTest(m.name)} disabled={testing === m.name}
                  className={`w-7 h-7 flex items-center justify-center rounded-md transition-all disabled:opacity-40 ${
                    testing === m.name ? 'text-purple-400 bg-purple-500/10' : 'text-slate-600 hover:text-purple-400 hover:bg-purple-500/10'
                  }`} title="Test model">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </button>
                )}
                <button onClick={() => copy(m.id)}
                  className={`w-7 h-7 flex items-center justify-center rounded-md transition-all ${
                    copiedId === m.id ? 'text-emerald-400 bg-emerald-500/15' : 'text-slate-600 hover:text-cyan-300 hover:bg-cyan-500/10'
                  }`} title="Copy model ID">
                  {copiedId === m.id ? <span className="text-[9px] font-mono font-bold">OK</span> : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
                <button onClick={() => handleToggle(m.name, m.blocked)} disabled={toggling === m.id}
                  className={`w-7 h-7 flex items-center justify-center rounded-md transition-all disabled:opacity-40 ${
                    m.blocked ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' : 'text-slate-600 hover:text-red-400 hover:bg-red-500/10'
                  }`} title={m.blocked ? 'Unblock model' : 'Block model'}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d={m.blocked ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' : 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636'} />
                  </svg>
                </button>
              </div>
            </div>
          ))}
          {data.models.length === 0 && (
            <div className="px-5 py-8 text-center text-[11px] font-mono text-slate-600">No models</div>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-[10px] font-mono font-semibold uppercase tracking-[0.12em] text-slate-500">Keys</h2>
            <span className="text-[10px] font-mono text-slate-600">{data.keys.length}</span>
          </div>
          {data.type === 'oauth' ? (
            <button onClick={handleOpenOAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-semibold text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Connect OAuth
            </button>
          ) : (
            <button onClick={() => { setNewKeyValue(''); setShowAddModal(true) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-semibold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-all">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 4v16m8-8H4" />
              </svg>
              Add Keys
            </button>
          )}
        </div>
        <div className="divide-y divide-white/[0.04] max-h-80 overflow-y-auto">
          {data.keys.map(k => (
            <div key={k.id} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${k.is_locked ? 'bg-red-500' : 'bg-emerald-500'}`} />
                <div className="min-w-0">
                  {k.label && <div className="text-[11px] font-mono text-slate-400 truncate">{k.label}</div>}
                  <code className="text-[10px] font-mono text-slate-600 truncate block">{k.masked}</code>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                {k.is_locked && k.locked_remaining > 0 && (
                  <span className="text-[9px] font-mono text-red-400/70">{k.locked_remaining}s</span>
                )}
                <button onClick={() => handleDeleteKey(k.id)} disabled={deletingKey === k.id}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-30" title="Delete key">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
          {data.keys.length === 0 && (
            <div className="px-5 py-8 text-center text-[11px] font-mono text-slate-600">No keys configured</div>
          )}
        </div>
      </div>

      {/* Add Keys Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowAddModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg mx-4 rounded-2xl bg-[#0F1A2A] border border-white/[0.08] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
              <h2 className="text-xs font-mono font-bold text-white tracking-tight">Add Keys</h2>
              <button onClick={() => setShowAddModal(false)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/[0.06] transition-colors">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5">
              <textarea value={newKeyValue} onChange={e => setNewKeyValue(e.target.value)}
                placeholder={"label | sk-xxx\nsk-yyy\nlabel2 | sk-zzz"} rows={6}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-xs font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all resize-none" autoFocus />
              <p className="text-[10px] font-mono text-slate-600 mt-2">Supports: <code className="text-slate-500">label | key</code> or just <code className="text-slate-500">key</code>, one per line</p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/[0.04]">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-lg text-[11px] font-mono text-slate-400 hover:text-slate-300 hover:bg-white/[0.04] transition-all">Cancel</button>
              <button onClick={async () => { await handleAddKey(); setShowAddModal(false) }}
                disabled={adding || !newKeyValue.trim()}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-[11px] font-mono font-semibold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-all disabled:opacity-40">
                {adding ? 'Adding...' : `Add ${newKeyValue.trim().split('\n').filter(Boolean).length} key${newKeyValue.trim().split('\n').filter(Boolean).length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OAuth Connect Modal */}
      {showOAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => { setShowOAuthModal(false); setOauthDone(false) }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg mx-4 rounded-2xl bg-[#0F1A2A] border border-white/[0.08] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
              <h2 className="text-xs font-mono font-bold text-white tracking-tight">Connect OAuth</h2>
              <button onClick={() => { setShowOAuthModal(false); setOauthDone(false) }} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/[0.06] transition-colors">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {oauthDone ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-mono text-emerald-400">Connected successfully!</p>
                <button onClick={() => { setShowOAuthModal(false); setOauthDone(false) }} className="px-4 py-2 rounded-lg text-[11px] font-mono text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-all">Done</button>
              </div>
            ) : isDeviceCode ? (
              /* Device Code Flow (FreeBuff) - URL + auto-poll */
              <div className="p-5 space-y-4">
                <p className="text-[10px] font-mono text-slate-400 leading-relaxed">Open the login page below and authorize.</p>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">Login URL</label>
                  <div className="flex gap-2">
                    <input readOnly value={oauthUrl}
                      className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[10px] font-mono text-purple-300 truncate" />
                    <a href={oauthUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-mono font-semibold text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all flex-shrink-0">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open
                    </a>
                  </div>
                </div>
                {fbPolling && (
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                    <svg className="w-3 h-3 text-purple-400 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Waiting for login...
                  </div>
                )}
                {oauthError && (
                  <div className="rounded-lg bg-red-950/15 border border-red-900/25 p-3">
                    <p className="text-[10px] font-mono text-red-400/80">{oauthError}</p>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button onClick={() => { fbPollRef.current = false; setShowOAuthModal(false); setOauthDone(false) }} className="px-4 py-2 rounded-lg text-[11px] font-mono text-slate-400 hover:text-slate-300 hover:bg-white/[0.04] transition-all">Close</button>
                </div>
              </div>
            ) : (
              /* PKCE Flow (CX) - URL + redirect code */
              <div className="p-5 space-y-4">
                <p className="text-[10px] font-mono text-slate-400 leading-relaxed">Open the authorization page, log in, then paste the redirect code below.</p>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">Authorization URL</label>
                  <div className="flex gap-2">
                    <input readOnly value={oauthUrl}
                      className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[10px] font-mono text-purple-300 truncate" />
                    <a href={oauthUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-mono font-semibold text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all flex-shrink-0">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open
                    </a>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">Redirect Code</label>
                  <input value={oauthCode} onChange={e => setOauthCode(e.target.value)} placeholder="Paste the code from the redirect URL..."
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[10px] font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/40 transition-all" />
                </div>
                {oauthError && (
                  <div className="rounded-lg bg-red-950/15 border border-red-900/25 p-3">
                    <p className="text-[10px] font-mono text-red-400/80">{oauthError}</p>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => { setShowOAuthModal(false); setOauthDone(false) }} className="px-4 py-2 rounded-lg text-[11px] font-mono text-slate-400 hover:text-slate-300 hover:bg-white/[0.04] transition-all">Cancel</button>
                  <button onClick={handleOAuthExchange} disabled={oauthConnecting || !oauthCode.trim()}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-[11px] font-mono font-semibold text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all disabled:opacity-40">
                    {oauthConnecting ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test Result Modal */}
      {testResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setTestResult(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg mx-4 rounded-2xl bg-[#0F1A2A] border border-white/[0.08] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <h2 className="text-xs font-mono font-bold text-white tracking-tight">Test Result</h2>
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md border ${testResult.ok ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-red-500/10 text-red-400 border-red-500/25'}`}>
                  {testResult.ok ? 'SUCCESS' : 'ERROR'}
                </span>
              </div>
              <button onClick={() => setTestResult(null)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/[0.06] transition-colors">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                  <div className="text-[9px] font-mono text-slate-600">Latency</div>
                  <div className="text-sm font-mono font-semibold text-slate-200 mt-1">{testResult.latency_ms}ms</div>
                </div>
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                  <div className="text-[9px] font-mono text-slate-600">Tokens</div>
                  <div className="text-sm font-mono font-semibold text-slate-200 mt-1">{testResult.total_tokens}</div>
                </div>
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                  <div className="text-[9px] font-mono text-slate-600">Model</div>
                  <div className="text-[10px] font-mono font-semibold text-slate-400 mt-1 truncate" title={testResult.model}>{testResult.model?.split('/').pop()}</div>
                </div>
              </div>
              {testResult.ok ? (
                <div>
                  <div className="text-[9px] font-mono text-slate-600 mb-1.5">RESPONSE</div>
                  <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
                    <p className="text-xs font-mono text-slate-300">{testResult.response || '(empty)'}</p>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-[9px] font-mono text-slate-600">
                    <span>↑ {testResult.prompt_tokens} prompt</span>
                    <span>↓ {testResult.completion_tokens} completion</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-[9px] font-mono text-slate-600 mb-1.5">ERROR</div>
                  <div className="rounded-lg bg-red-950/20 border border-red-900/30 p-3">
                    <p className="text-xs font-mono text-red-400/90 break-all">{testResult.error || 'Unknown error'}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end px-5 py-4 border-t border-white/[0.04]">
              <button onClick={() => setTestResult(null)} className="px-4 py-2 rounded-lg text-[11px] font-mono text-slate-400 hover:text-slate-300 hover:bg-white/[0.04] transition-all">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
