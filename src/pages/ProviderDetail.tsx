import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getProviderDetail, blockModel, unblockModel, addKey, deleteKey, testModel } from '../api'
import type { ProviderDetail as ProviderDetailType } from '../api'
import OAuthConnectModal from '../components/OAuthConnectModal'

const typeLabel: Record<string, string> = {
  apikey: ['A','P','I',' ','K','e','y'].join(''),
  oauth: 'OAuth',
  custom: 'Custom',
}

// Form config untuk provider custom (multi-field)
const keyFormConfig: Record<string, { fields: { key: string; label: string; placeholder: string }[] }> = {
  cf: { fields: [
    { key: 'apiKey', label: 'API Token', placeholder: 'cf_api_token_xxx' },
    { key: 'accountId', label: 'Account ID', placeholder: 'your_account_uuid' },
  ]},
}

export default function ProviderDetail() {
  const { id } = useParams()
  const [data, setData] = useState<ProviderDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState('')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [keyFields, setKeyFields] = useState<Record<string, string>>({})
  const [adding, setAdding] = useState(false)
  const [deletingKey, setDeletingKey] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<any>(null)

  const load = useCallback(() => {
    if (!id) return
    getProviderDetail(id)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const [showOAuth, setShowOAuth] = useState(false)

  const providerInfo = useMemo(() => data ? {
    id: data.id, name: data.name, display_name: data.display_name,
    icon_url: data.icon_url, color: data.color, oauth_flow: data.oauth_flow
  } : null, [data])

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
    if (!id) return
    setAdding(true)
    try {
      const formCfg = keyFormConfig[id]
      if (formCfg) {
        // Multi-field provider: build JSON from keyFields
        const missing = formCfg.fields.find(f => !keyFields[f.key]?.trim())
        if (missing) { setError(`${missing.label} required`); setAdding(false); return }
        const obj: Record<string, string> = {}
        formCfg.fields.forEach(f => { obj[f.key] = keyFields[f.key].trim() })
        const kv = JSON.stringify(obj)
        const label = id + '-' + (keyFields[formCfg.fields[0].key]?.slice(0, 8) || 'key')
        await addKey(id, kv, label)
        setNewKeyValue(''); setKeyFields({})
      } else {
        // Default: textarea, one key per line
        const lines = newKeyValue.trim().split('\n').map(l => l.trim()).filter(Boolean)
        for (const line of lines) {
          const pipeIdx = line.indexOf('|')
          if (pipeIdx > -1) {
            const lbl = line.slice(0, pipeIdx).trim()
            const val = line.slice(pipeIdx + 1).trim()
            if (val) await addKey(id, val, lbl)
          } else {
            await addKey(id, line, id + '-' + line.slice(0, 8))
          }
        }
        setNewKeyValue('')
      }
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
                <button onClick={() => handleTest(m.id)} disabled={testing === m.id}
                  className={`w-7 h-7 flex items-center justify-center rounded-md transition-all disabled:opacity-40 ${
                    testing === m.id ? 'text-purple-400 bg-purple-500/10' : 'text-slate-600 hover:text-purple-400 hover:bg-purple-500/10'
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
            <button onClick={() => setShowOAuth(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-semibold text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Connect OAuth
            </button>
          ) : (
            <button onClick={() => { setNewKeyValue(''); setKeyFields({}); setShowAddModal(true) }}
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
              {keyFormConfig[id ?? ''] ? (
                <div className="space-y-3">
                  {keyFormConfig[id ?? '']!.fields.map((f: {key:string;label:string;placeholder:string}, fi: number) => (
                    <div key={f.key}>
                      <label className="text-[10px] font-mono text-slate-500 mb-1 block">{f.label}</label>
                      <input value={keyFields[f.key] || ''} onChange={e => setKeyFields(p => ({...p, [f.key]: e.target.value}))}
                        placeholder={f.placeholder} autoFocus={fi === 0}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-xs font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all" />
                    </div>
                  ))}
                  <p className="text-[10px] font-mono text-slate-600">All fields required. Stored as JSON.</p>
                </div>
              ) : (
              <textarea value={newKeyValue} onChange={e => setNewKeyValue(e.target.value)}
                placeholder={"label | sk-xxx\nsk-yyy\nlabel2 | sk-zzz"} rows={6}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-xs font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all resize-none" autoFocus />
              )}
              {!keyFormConfig[id ?? ''] && <p className="text-[10px] font-mono text-slate-600 mt-2">Supports: <code className="text-slate-500">label | key</code> or just <code className="text-slate-500">key</code>, one per line</p>}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/[0.04]">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-lg text-[11px] font-mono text-slate-400 hover:text-slate-300 hover:bg-white/[0.04] transition-all">Cancel</button>
              <button onClick={async () => { await handleAddKey(); setShowAddModal(false) }}
                disabled={adding || ((id ? keyFormConfig[id] : undefined) ? !Object.values(keyFields).some(v => v.trim()) : !newKeyValue.trim())}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-[11px] font-mono font-semibold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-all disabled:opacity-40">
                {adding ? 'Adding...' : (id ? keyFormConfig[id] : undefined) ? 'Add Key' : `Add ${newKeyValue.trim().split('\n').filter(Boolean).length} key${newKeyValue.trim().split('\n').filter(Boolean).length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OAuth Connect Modal */}
      <OAuthConnectModal
        open={showOAuth}
        provider={providerInfo}
        onClose={() => setShowOAuth(false)}
        onSuccess={() => { setShowOAuth(false); load() }}
      />

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
