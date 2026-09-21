import { useState, useEffect } from 'react'
import { iconUrl, getProviders, getProviderDetail, validateModels, testModel } from '../api'
import type { ProviderMeta, ProviderDetail, ModelInfo, TestResult, ValidateModel } from '../api/types'

export default function Playground() {
  const [providers, setProviders] = useState<ProviderMeta[]>([])
  const [selected, setSelected] = useState<string>('')
  const [providerDetail, setProviderDetail] = useState<ProviderDetail | null>(null)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [remoteModels, setRemoteModels] = useState<ValidateModel[]>([])
  const [remoteLoading, setRemoteLoading] = useState(false)
  const [remoteError, setRemoteError] = useState('')
  const [selectedKeyId, setSelectedKeyId] = useState<string>('')
  const [customModel, setCustomModel] = useState('')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [keyMode, setKeyMode] = useState<'auto' | 'manual'>('auto')

  const filtered = providers.filter(p =>
    !search || p.display_name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase())
  )

  const sel = providers.find(p => p.id === selected)
  const selName = sel?.display_name || ''
  const selColor = sel?.color || '#6366F1'
  const selIcon = sel?.icon_name || ''

  useEffect(() => {
    getProviders().then(setProviders).catch(console.error)
  }, [])

  useEffect(() => {
    if (!selected) {
      setProviderDetail(null); setModels([]); setRemoteModels([])
      setRemoteError(''); setSelectedKeyId(''); return
    }
    getProviderDetail(selected).then(d => {
      setProviderDetail(d); setModels(d.models || [])
      const active = (d.keys || []).find(k => !k.is_locked)
      setSelectedKeyId(active?.id || '')
    }).catch(console.error)
  }, [selected])

  const fetchModels = async (keyId?: string) => {
    if (!selected) return
    setRemoteLoading(true); setRemoteError('')
    if (keyMode === 'auto') {
      const keys = providerDetail?.keys || []
      for (const k of keys) {
        if (k.is_locked) continue
        try {
          const r = await validateModels(selected, k.id)
          if (r.ok && r.models) {
            setRemoteModels(r.models); setRemoteError('')
            setSelectedKeyId(k.id)
            break
          }
        } catch {}
      }
    } else {
      validateModels(selected, keyId || undefined).then(r => {
        if (r.ok && r.models) setRemoteModels(r.models)
        else { setRemoteError(r.error || 'Failed'); setRemoteModels([]) }
      }).catch(e => { setRemoteError(e.message); setRemoteModels([]) })
    }
    setRemoteLoading(false)
  }

  const handleTest = async () => {
    if (!selected) return
    const model = customModel || models[0]?.id
    if (!model) return
    setTesting(true); setResult(null)
    try {
      const res = await testModel(selected, model)
      setResult(res)
    } catch (e: any) {
      setResult({
        ok: false, response: '', model, latency_ms: 0,
        prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, error: e.message,
      })
    }
    setTesting(false)
  }

  return (
    <div className="space-y-6 max-w-full">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="heading-brutal text-3xl uppercase tracking-tight">PLAYGROUND</h1>
          <p className="text-lg font-medium text-subtext">Test models across providers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4 min-w-0">
          {/* Provider selector */}
          <div className="brutal-card overflow-hidden min-w-0">
            <div className="px-5 py-3 border-b-2 border-line bg-muted">
              <h2 className="text-xs mono-brutal font-bold text-[#ff3d81] uppercase tracking-wider">Provider</h2>
            </div>
            <div className="p-5">
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setOpen(true) }}
                onFocus={() => setOpen(true)} placeholder="Search provider..."
                className="w-full px-3 py-2.5 border-2 border-line rounded-lg font-mono text-sm bg-surface placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff3d81] transition-all mb-2" />

              {selected && !open && (
                <div onClick={() => setOpen(true)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-canvas border-2 border-line cursor-pointer hover:bg-canvas/80 transition-all">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border-2 border-line"
                    style={{ background: `${selColor}15` }}>
                    <img src={iconUrl(selIcon)} alt="" className="w-4 h-4 object-contain" onError={e => { (e.target as any).style.display = 'none' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-ink truncate">{selName}</div>
                    <div className="text-[8px] mono-brutal text-subtext">{selected}</div>
                  </div>
                  <svg className="w-3.5 h-3.5 text-subtext" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              )}

              {open && (
                <div className="rounded-lg bg-surface border-2 border-line shadow-[2px_2px_0px_0px_var(--shadow)] sm:shadow-[3px_3px_0px_0px_var(--shadow)] lg:shadow-[6px_6px_0px_0px_var(--shadow)] max-h-56 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <div className="px-4 py-6 text-center text-[10px] mono-brutal text-subtext">No providers found</div>
                  ) : (
                    filtered.map(p => {
                      const isSel = selected === p.id
                      const hasKeys = p.active_keys > 0
                      return (
                        <div key={p.id}
                          onClick={() => { if (!hasKeys) return; setSelected(p.id); setOpen(false); setSearch(''); setCustomModel(''); setResult(null) }}
                          className={`flex items-center gap-3 px-4 py-3 transition-all border-b-2 border-line last:border-b-0 ${
                            !hasKeys ? 'opacity-30 cursor-not-allowed' :
                            isSel ? 'cursor-pointer bg-[#ff3d81]/10 border-l-4 border-l-[#ff3d81]' : 'cursor-pointer hover:bg-canvas border-l-4 border-l-transparent'
                          }`}>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border-2 border-line"
                            style={{ background: `${p.color}15` }}>
                            {p.icon_name ? (
                              <img src={iconUrl(p.icon_name)} alt="" className="w-4 h-4 object-contain" />
                            ) : (
                              <span className="text-[10px] font-bold" style={{ color: p.color }}>{p.id.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-ink truncate">{p.display_name}</span>
                              <span className="text-[8px] mono-brutal text-subtext">{p.id}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[8px] mono-brutal text-subtext">{p.total_keys} keys</span>
                              <div className={`w-1.5 h-1.5 rounded-full border border-line ${hasKeys ? 'bg-[#3ddc97]' : 'bg-muted'}`} />
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {selected && providerDetail && (
            <>
              {/* Base URL */}
              <div className="brutal-card overflow-hidden min-w-0">
                <div className="px-5 py-3 border-b-2 border-line bg-muted">
                  <h2 className="text-xs mono-brutal font-bold text-[#ff3d81] uppercase tracking-wider">Base URL</h2>
                </div>
                <div className="p-5">
                  <code className="block text-[11px] mono-brutal text-subtext bg-muted rounded-lg px-3 py-2.5 border-2 border-line break-all overflow-hidden">
                    {providerDetail.base_url || `${providerDetail.display_name} (no base URL)`}
                  </code>
                </div>
              </div>

              {/* Keys */}
              <div className="brutal-card overflow-hidden min-w-0">
                <div className="px-5 py-3 border-b-2 border-line bg-muted flex items-center justify-between">
                  <h2 className="text-xs mono-brutal font-bold text-[#ff3d81] uppercase tracking-wider">Key</h2>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setKeyMode('auto')}
                      className={`brutal-btn px-2 py-1 text-[9px] font-bold ${keyMode === 'auto' ? 'bg-[#ff3d81] text-white' : 'bg-surface text-subtext hover:text-ink'}`}>Auto</button>
                    <button onClick={() => setKeyMode('manual')}
                      className={`brutal-btn px-2 py-1 text-[9px] font-bold ${keyMode === 'manual' ? 'bg-[#ff3d81] text-white' : 'bg-surface text-subtext hover:text-ink'}`}>Manual</button>
                  </div>
                </div>
                <div className="p-5">
                  {keyMode === 'auto' ? (
                    <div className="text-[10px] mono-brutal text-subtext">Auto mode — cycles through keys</div>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {(providerDetail.keys || []).length === 0 ? (
                        <div className="text-[10px] mono-brutal text-subtext">No keys</div>
                      ) : (
                        (providerDetail.keys || []).map(k => (
                          <div key={k.id}
                            onClick={() => setSelectedKeyId(k.id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-[11px] mono-brutal border-2 ${
                              selectedKeyId === k.id
                                ? 'bg-[#ff3d81]/10 text-[#ff3d81] border-[#ff3d81] font-bold'
                                : 'text-subtext hover:bg-canvas border-transparent hover:border-line'
                            } ${k.is_locked ? 'opacity-40' : ''}`}>
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 border border-line ${k.is_locked ? 'bg-[#ff6b5e]' : 'bg-[#3ddc97]'}`} />
                            <span className="truncate flex-1">{k.label || k.id}</span>
                            <span className="text-[9px] text-subtext/70">{k.masked}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Models */}
              <div className="brutal-card overflow-hidden min-w-0">
                <div className="px-5 py-3 border-b-2 border-line bg-muted flex items-center justify-between">
                  <h2 className="text-xs mono-brutal font-bold text-[#ff3d81] uppercase tracking-wider">Models</h2>
                  <span className="text-[9px] mono-brutal text-subtext">{models.length} / {remoteModels.length || '?'}</span>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="text-[9px] mono-brutal text-subtext uppercase tracking-wider mb-1 font-bold">Custom model</div>
                      <input type="text" value={customModel} onChange={e => setCustomModel(e.target.value)}
                        placeholder="claude-sonnet-4, gpt-5.5, ..."
                        className="w-full px-3 py-2 border-2 border-line rounded-lg text-[11px] mono-brutal bg-surface placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff3d81] transition-all" />
                    </div>
                    <button onClick={() => fetchModels(selectedKeyId)} disabled={remoteLoading}
                      className="brutal-btn mt-5 px-3 py-2 text-xs font-bold bg-[#c8a2ff] text-on-accent disabled:opacity-40 whitespace-nowrap">
                      {remoteLoading ? '↻ Fetching...' : 'Fetch'}
                    </button>
                  </div>

                  {remoteLoading && (
                    <div className="text-[10px] mono-brutal text-subtext animate-pulse">Fetching remote models...</div>
                  )}
                  {remoteError && (
                    <div className="px-3 py-2 rounded-lg bg-[#ff6b5e]/10 border-2 border-[#ff6b5e] text-[10px] mono-brutal text-[#ff6b5e] font-bold break-all overflow-hidden">{remoteError}</div>
                  )}

                  <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-thin">
                    {models.map(m => (
                      <div key={m.id}
                        onClick={() => { setCustomModel(m.id); setResult(null) }}
                        className={`px-3 py-2 rounded-lg cursor-pointer transition-all text-[11px] mono-brutal border-2 ${
                          customModel === m.id
                            ? 'bg-[#ff3d81]/10 text-[#ff3d81] border-[#ff3d81] font-bold'
                            : 'text-subtext hover:bg-canvas border-transparent hover:border-line'
                        }`}>
                        <div className="truncate">{m.id}</div>
                      </div>
                    ))}
                    {models.length === 0 && remoteModels.length > 0 && (
                      <div className="text-[9px] mono-brutal text-subtext mb-1 px-1 font-bold">Remote models ({remoteModels.length}):</div>
                    )}
                    {remoteModels.filter(rm => !models.some(m => m.id === rm.id)).map(rm => (
                      <div key={rm.id}
                        onClick={() => { setCustomModel(rm.id); setResult(null) }}
                        className={`px-3 py-2 rounded-lg cursor-pointer transition-all text-[11px] mono-brutal border-2 ${
                          customModel === rm.id
                            ? 'bg-[#c8a2ff]/10 text-[#c8a2ff] border-[#c8a2ff] font-bold'
                            : 'text-subtext hover:bg-canvas border-transparent hover:border-line'
                        }`}>
                        <div className="truncate flex items-center gap-2">
                          <span>{rm.id}</span>
                          {rm.context_length && <span className="text-[9px] text-subtext/70">{rm.context_length.toLocaleString()}</span>}
                          <span className="text-[8px] text-subtext/70 ml-auto">remote</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={handleTest} disabled={testing || !customModel}
                    className="brutal-btn w-full py-2.5 text-xs font-bold bg-[#ff3d81] text-white disabled:opacity-40">
                    {testing ? '↻ Testing...' : '▶ Test Model'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-3 min-w-0 max-w-full w-full">
          {!selected ? (
            <div className="brutal-card p-12 text-center">
              <div className="text-xs mono-brutal text-subtext">Select a provider to start testing</div>
            </div>
          ) : result ? (
            <div className="brutal-card overflow-hidden min-w-0">
              <div className="px-5 py-3 border-b-2 border-line bg-muted flex items-center justify-between">
                <h2 className="text-xs mono-brutal font-bold text-[#ff3d81] uppercase tracking-wider">Result</h2>
                <span className={`status-pill ${
                  result.ok ? 'bg-[#3ddc97] text-on-accent' : 'bg-[#ff6b5e] text-white'
                }`}>
                  {result.ok ? 'SUCCESS' : 'ERROR'}
                </span>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="px-4 py-3 rounded-lg bg-muted border-2 border-line">
                    <div className="text-[8px] mono-brutal text-subtext uppercase tracking-wider font-bold">Latency</div>
                    <div className="text-sm mono-brutal font-bold text-ink mt-1">{result.latency_ms}ms</div>
                  </div>
                  <div className="px-4 py-3 rounded-lg bg-muted border-2 border-line">
                    <div className="text-[8px] mono-brutal text-subtext uppercase tracking-wider font-bold">Tokens</div>
                    <div className="text-sm mono-brutal font-bold text-ink mt-1">{result.total_tokens}</div>
                  </div>
                  <div className="px-4 py-3 rounded-lg bg-muted border-2 border-line">
                    <div className="text-[8px] mono-brutal text-subtext uppercase tracking-wider font-bold">Model</div>
                    <div className="text-[11px] mono-brutal font-bold text-subtext mt-1 truncate">{result.model?.split('/').pop()}</div>
                  </div>
                </div>

                {result.ok ? (
                  <div>
                    <div className="text-[9px] mono-brutal text-subtext uppercase tracking-wider mb-1.5 font-bold">Response</div>
                    <div className="px-4 py-3 rounded-lg bg-muted border-2 border-line break-words overflow-hidden">
                      <p className="text-xs mono-brutal text-ink whitespace-pre-wrap break-all">{result.response || '(empty)'}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[10px] mono-brutal text-subtext font-bold">
                      <span>↑ {result.prompt_tokens} prompt</span>
                      <span>↓ {result.completion_tokens} completion</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-[9px] mono-brutal text-subtext uppercase tracking-wider mb-1.5 font-bold">Error</div>
                    <div className="px-4 py-3 rounded-lg bg-[#ff6b5e]/10 border-2 border-[#ff6b5e] break-words overflow-hidden">
                      <p className="text-xs mono-brutal text-[#ff6b5e] font-bold break-all">{result.error || 'Unknown error'}</p>
                    </div>
                  </div>
                )}

                <button onClick={() => setResult(null)}
                  className="brutal-btn bg-surface text-ink px-4 py-2 text-xs font-bold">
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div className="brutal-card p-12 text-center">
              <div className="text-xs mono-brutal text-subtext">Select a model and click Test</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
