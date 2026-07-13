import Modal from '../components/Modal'
import { useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import type { ProviderDetail as ProviderDetailType } from '../api'
import OAuthConnectModal from '../components/OAuthConnectModal'
import { useProviderDetail } from '../hooks/useProviderDetail'

const typeLabel: Record<string, string> = {
  apikey: "API Key",
  oauth: 'OAuth',
  custom: 'Custom',
}

export default function ProviderDetail() {
  const { id } = useParams()
  const ctx = useProviderDetail(id)

  useEffect(() => { ctx.load() }, [ctx.load])

  const providerInfo = useMemo(() => ctx.data ? {
    id: ctx.data.id, name: ctx.data.name, display_name: ctx.data.display_name,
    icon_url: ctx.data.icon_url, color: ctx.data.color, oauth_flow: ctx.data.oauth_flow
  } : null, [ctx.data])

  if (ctx.loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-xs font-mono text-slate-500 animate-pulse">LOADING...</div>
    </div>
  )

  if (ctx.error) return (
    <div className="border border-red-900/50 rounded-xl p-6 text-center bg-red-950/10">
      <div className="text-red-400 font-mono text-xs">ERROR: {ctx.error}</div>
    </div>
  )

  if (!ctx.data) return null

  const { data, testResult } = ctx
  const label = typeLabel[data.type] || data.type

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
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

      {/* Stats */}
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

      {/* Capabilities */}
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

      {/* Models */}
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
                <button onClick={() => ctx.handleTest(m.id)} disabled={ctx.testing === m.id}
                  className={`w-7 h-7 flex items-center justify-center rounded-md transition-all disabled:opacity-40 ${
                    ctx.testing === m.id ? 'text-purple-400 bg-purple-500/10' : 'text-slate-600 hover:text-purple-400 hover:bg-purple-500/10'
                  }`} title="Test model">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </button>
                )}
                <button onClick={() => ctx.copy(m.id)} title="Copy model ID"
                  className={`w-7 h-7 flex items-center justify-center rounded-md ${
                    ctx.copiedId === m.id ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-600 hover:text-cyan-400 hover:bg-cyan-500/10'
                  }`}>
                  {ctx.copiedId === m.id ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                  )}
                </button>
                <button onClick={() => ctx.handleToggle(m.id, m.blocked)}
                  className={`w-7 h-7 flex items-center justify-center rounded-md transition-all ${
                    ctx.toggling === m.id ? 'text-amber-400 bg-amber-500/10' :
                    m.blocked ? 'text-slate-600 hover:text-amber-400 hover:bg-amber-500/10' :
                    'text-slate-600 hover:text-amber-400 hover:bg-amber-500/10'
                  }`} title={m.blocked ? "Unblock" : "Block"}>
                  {ctx.toggling === m.id ? (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="8" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      {m.blocked ? <path d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        : <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />}
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Keys */}
      <div className="rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between">
          <h2 className="text-[10px] font-mono font-semibold uppercase tracking-[0.12em] text-slate-500">Keys</h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-600">{data.keys.length}</span>
            {data.type === 'oauth' && (
              <button onClick={() => ctx.setShowOAuth(true)}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-colors">
                Connect OAuth
              </button>
            )}
          </div>
        </div>
        {data.keys.length === 0 ? (
          <div className="px-5 py-8 text-center text-[10px] font-mono text-slate-600">No keys configured</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {data.keys.map(k => (
              <div key={k.id} className="px-5 py-3 flex items-center justify-between group">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-200 truncate">{k.label || k.id}</span>
                    {k.is_locked && <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">LOCKED</span>}
                  </div>
                  <div className="text-[10px] font-mono text-slate-600 truncate mt-0.5">
                    <span className="text-slate-600">{k.key_type || 'apikey'}</span>
                    <span className="mx-1.5 text-slate-700">·</span>
                    <code className="text-slate-500">{k.masked}</code>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <button onClick={() => ctx.copy(k.id)}
                    className={`w-7 h-7 flex items-center justify-center rounded-md ${
                      ctx.copiedId === k.id ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-600 hover:text-cyan-400 hover:bg-cyan-500/10'
                    }`}>
                    {ctx.copiedId === k.id ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                    )}
                  </button>
                  <button onClick={() => ctx.handleDeleteKey(k.id)} disabled={ctx.deletingKey === k.id}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40">
                    {ctx.deletingKey === k.id ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="8" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Add Key */}
        {data.type !== 'oauth' && (
        <div className="px-5 py-4 border-t border-white/[0.04] bg-white/[0.01]">
          <button onClick={() => ctx.setShowAddModal(true)}
            className="text-[10px] font-mono px-3 py-1.5 rounded bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:text-slate-200 hover:border-white/[0.1] transition-colors">
            + Add Key
          </button>
        </div>
        )}
      </div>

      {/* Add Key Modal */}
      {data.type !== 'oauth' && (
      <Modal open={ctx.showAddModal} onClose={() => ctx.setShowAddModal(false)}>
            <h2 className="text-sm font-bold text-slate-200 mb-4">Add Key</h2>
            {keyFormConfig[data.id] ? (
              <div className="space-y-3">
                {keyFormConfig[data.id].fields.map(f => (
                  <div key={f.key}>
                    <label className="text-[10px] font-mono text-slate-500 mb-1 block">{f.label}</label>
                    <input type="text" value={ctx.keyFields[f.key] || ''} onChange={e => ctx.setKeyFields(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40" />
                  </div>
                ))}
              </div>
            ) : (
              <textarea value={ctx.newKeyValue} onChange={e => ctx.setNewKeyValue(e.target.value)}
                placeholder="One key per line, or pipe: label | key_value"
                className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 h-24 resize-none" />
            )}
            <div className="flex items-center justify-end gap-2 mt-4">
              <button onClick={() => ctx.setShowAddModal(false)}
                className="px-3 py-1.5 text-[10px] font-mono text-slate-500 hover:text-slate-300">Cancel</button>
              <button onClick={ctx.handleAddKey} disabled={ctx.adding}
                className="px-4 py-1.5 text-[10px] font-mono font-semibold text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 disabled:opacity-40">
                {ctx.adding ? 'Adding...' : 'Add'}
              </button>
            </div>
        </Modal>
      )}
      {/* Test Result Modal */}
      {testResult && (
      <Modal open={true} onClose={() => ctx.setTestResult(null)}>
            <h2 className="text-sm font-bold text-slate-200 mb-4">Test Result</h2>
            <div className="space-y-2 text-[10px] font-mono">
              <div className="flex justify-between"><span className="text-slate-500">Status</span>
                <span className={testResult.ok ? 'text-emerald-400' : 'text-red-400'}>{testResult.ok ? 'OK' : 'FAIL'}</span></div>
              {testResult.error && <div className="flex justify-between"><span className="text-slate-500">Error</span><span className="text-red-400">{testResult.error}</span></div>}
              <div className="flex justify-between"><span className="text-slate-500">Latency</span><span className="text-slate-300">{testResult.latency_ms}ms</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Tokens</span><span className="text-slate-300">{testResult.total_tokens} (in: {testResult.prompt_tokens}, out: {testResult.completion_tokens})</span></div>
              {testResult.response && <div className="mt-2 p-3 rounded-lg bg-black/20 border border-white/[0.06] text-slate-400 max-h-32 overflow-y-auto"><code className="text-[9px]">{testResult.response}</code></div>}
            </div>
            <button onClick={() => ctx.setTestResult(null)} className="w-full mt-4 py-2 rounded-lg text-[10px] font-mono text-slate-400 bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.15]">Close</button>
        </Modal>
      )}

      {/* OAuth Modal */}
      <OAuthConnectModal
        open={ctx.showOAuth}
        provider={providerInfo}
        onClose={() => ctx.setShowOAuth(false)}
        onSuccess={() => { ctx.setShowOAuth(false); ctx.load() }}
      />
    </div>
  )
}

const keyFormConfig: Record<string, { fields: { key: string; label: string; placeholder: string }[] }> = {
  cf: { fields: [
    { key: 'apiKey', label: 'API Token', placeholder: 'cf_api_token_xxx' },
    { key: 'accountId', label: 'Account ID', placeholder: 'your_account_uuid' },
  ]},
}
