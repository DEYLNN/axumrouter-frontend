import { useState, useEffect } from 'react'
import { iconUrl, getProviders, getProviderDetail, testModel } from '../api'
import type { ProviderMeta, ProviderDetail, ModelInfo, TestResult } from '../api'


export default function Playground() {
  const [providers, setProviders] = useState<ProviderMeta[]>([])
  const [selected, setSelected] = useState<string>('')
  const [providerDetail, setProviderDetail] = useState<ProviderDetail | null>(null)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [customModel, setCustomModel] = useState('')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Filtered providers
  const filtered = providers.filter(p =>
    !search || p.display_name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase())
  )

  // Selected provider display data
  const sel = providers.find(p => p.id === selected)
  const selName = sel?.display_name || ''
  const selColor = sel?.color || '#6366F1'
  const selIcon = sel?.icon_name || ''

  // Load providers
  useEffect(() => {
    getProviders().then(setProviders).catch(console.error)
  }, [])

  // Load provider detail + models when selection changes
  useEffect(() => {
    if (!selected) {
      setProviderDetail(null)
      setModels([])
      return
    }
    getProviderDetail(selected).then(d => {
      setProviderDetail(d)
      setModels(d.models || [])
    }).catch(console.error)
  }, [selected])

  const handleTest = async () => {
    if (!selected) return
    const model = customModel || models[0]?.id
    if (!model) return

    setTesting(true)
    setResult(null)
    try {
      const res = await testModel(selected, model)
      setResult(res)
    } catch (e: any) {
      setResult({
        ok: false,
        response: '',
        model,
        latency_ms: 0,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        error: e.message,
      })
    }
    setTesting(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent"
            style={{ textShadow: '0 0 30px rgba(6,182,212,0.3)' }}>
            PLAYGROUND
          </h1>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5">Test models across providers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Provider + Model selection */}
        <div className="lg:col-span-2 space-y-4">
          {/* Provider selector — modern */}
          <div className="border border-white/[0.06] rounded-xl bg-[#0a0f1e]/60 backdrop-blur-xl overflow-hidden"
            style={{ boxShadow: 'inset 0 1px 0 rgba(6,182,212,0.06), 0 0 20px rgba(6,182,212,0.03)' }}>
            <div className="px-5 py-3 border-b border-white/[0.04]">
              <h2 className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">Provider</h2>
            </div>
            <div className="p-5">
              {/* Search */}
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setOpen(true) }}
                onFocus={() => setOpen(true)} placeholder="Search provider..."
                className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2.5 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all mb-2"
                style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }} />

              {/* Selected pill */}
              {selected && !open && (
                <div onClick={() => setOpen(true)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-cyan-500/5 border border-cyan-500/20 cursor-pointer hover:bg-cyan-500/10 transition-all">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${selColor}15`, border: `1px solid ${selColor}30` }}>
                    <img src={iconUrl(selIcon)} alt="" className="w-4 h-4 object-contain" onError={e => { (e.target as any).style.display = 'none' }} />
                    <span className="text-[10px] font-bold" style={{ color: selColor, display: 'none' }}>{selected.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-slate-200 truncate">{selName}</div>
                    <div className="text-[8px] font-mono text-slate-600">{selected}</div>
                  </div>
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              )}

              {/* Dropdown */}
              {open && (
                <div className="rounded-lg bg-[#0d1225] border border-white/[0.1] shadow-xl shadow-black/50 max-h-56 overflow-y-auto"
                  style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)' }}>
                  {filtered.length === 0 ? (
                    <div className="px-4 py-6 text-center text-[10px] font-mono text-slate-600">No providers found</div>
                  ) : (
                    filtered.map(p => {
                      const isSel = selected === p.id
                      const hasKeys = p.active_keys > 0
                      return (
                        <div key={p.id}
                          onClick={() => { if (!hasKeys) return; setSelected(p.id); setOpen(false); setSearch(''); setCustomModel(''); setResult(null) }}
                          className={`flex items-center gap-3 px-4 py-3 transition-all ${
                            !hasKeys ? 'opacity-30 cursor-not-allowed' :
                            isSel ? 'cursor-pointer bg-cyan-500/8 border-l-2 border-cyan-400' : 'cursor-pointer hover:bg-white/[0.03] border-l-2 border-transparent'
                          }`}>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `${p.color}15`, border: `1px solid ${p.color}30` }}>
                            {p.icon_name ? (
                              <img src={iconUrl(p.icon_name)} alt="" className="w-4 h-4 object-contain" />
                            ) : (
                              <span className="text-[10px] font-bold" style={{ color: p.color }}>{p.id.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-medium text-slate-200 truncate">{p.display_name}</span>
                              <span className="text-[8px] font-mono text-slate-600">{p.id}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[8px] font-mono text-slate-600">{p.total_keys} keys</span>
                              <div className={`w-1.5 h-1.5 rounded-full ${hasKeys ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                style={hasKeys ? { boxShadow: '0 0 4px rgba(52,211,153,0.5)' } : {}} />
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

          {/* Base URL & Model */}
          {selected && providerDetail && (
            <>
              {/* Base URL */}
              <div className="border border-white/[0.06] rounded-xl bg-[#0a0f1e]/60 backdrop-blur-xl overflow-hidden"
                style={{ boxShadow: 'inset 0 1px 0 rgba(6,182,212,0.06), 0 0 20px rgba(6,182,212,0.03)' }}>
                <div className="px-5 py-3 border-b border-white/[0.04]">
                  <h2 className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">Base URL</h2>
                </div>
                <div className="p-5">
                  <code className="block text-[11px] font-mono text-slate-400 bg-black/40 rounded-lg px-3 py-2.5 border border-white/[0.06] break-all"
                    style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }}>
                    {providerDetail.base_url || `${providerDetail.display_name} (no base URL)`}
                  </code>
                </div>
              </div>

              {/* Models */}
              <div className="border border-white/[0.06] rounded-xl bg-[#0a0f1e]/60 backdrop-blur-xl overflow-hidden"
                style={{ boxShadow: 'inset 0 1px 0 rgba(6,182,212,0.06), 0 0 20px rgba(6,182,212,0.03)' }}>
                <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between">
                  <h2 className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">Models</h2>
                  <span className="text-[9px] font-mono text-slate-600">{models.length}</span>
                </div>
                <div className="p-5 space-y-3">
                  {/* Custom model input */}
                  <div>
                    <div className="text-[9px] font-mono text-slate-600 uppercase tracking-wider mb-1">Custom model</div>
                    <input type="text" value={customModel} onChange={e => setCustomModel(e.target.value)}
                      placeholder="claude-sonnet-4, gpt-5.5, ..."
                      className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all"
                      style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }} />
                  </div>

                  {/* Model list */}
                  <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-thin">
                    {models.map(m => (
                      <div key={m.id}
                        onClick={() => { setCustomModel(m.id); setResult(null) }}
                        className={`px-3 py-2 rounded-lg cursor-pointer transition-all text-[11px] font-mono ${
                          customModel === m.id
                            ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                            : 'text-slate-400 hover:bg-white/[0.03] border border-transparent'
                        }`}>
                        <div className="truncate">{m.id}</div>
                      </div>
                    ))}
                  </div>

                  {/* Test button */}
                  <button onClick={handleTest} disabled={testing || !customModel}
                    className="w-full py-2.5 rounded-lg text-[11px] font-mono font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all disabled:opacity-40"
                    style={{ boxShadow: '0 0 10px rgba(6,182,212,0.1)' }}>
                    {testing ? '↻ Testing...' : '▶ Test Model'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-3">
          {!selected ? (
            <div className="border border-white/[0.06] rounded-xl bg-[#0a0f1e]/60 backdrop-blur-xl p-12 text-center"
              style={{ boxShadow: 'inset 0 1px 0 rgba(6,182,212,0.06), 0 0 20px rgba(6,182,212,0.03)' }}>
              <div className="text-xs font-mono text-slate-600">Select a provider to start testing</div>
            </div>
          ) : result ? (
            <div className="border border-white/[0.06] rounded-xl bg-[#0a0f1e]/60 backdrop-blur-xl overflow-hidden"
              style={{ boxShadow: 'inset 0 1px 0 rgba(6,182,212,0.06), 0 0 20px rgba(6,182,212,0.03)' }}>
              <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between">
                <h2 className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">Result</h2>
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md border ${
                  result.ok ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-red-500/10 text-red-400 border-red-500/25'
                }`}>
                  {result.ok ? 'SUCCESS' : 'ERROR'}
                </span>
              </div>
              <div className="p-5 space-y-4">
                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="px-4 py-3 rounded-lg bg-black/40 border border-white/[0.04]">
                    <div className="text-[8px] font-mono text-slate-600 uppercase tracking-wider">Latency</div>
                    <div className="text-sm font-mono font-semibold text-slate-200 mt-1">{result.latency_ms}ms</div>
                  </div>
                  <div className="px-4 py-3 rounded-lg bg-black/40 border border-white/[0.04]">
                    <div className="text-[8px] font-mono text-slate-600 uppercase tracking-wider">Tokens</div>
                    <div className="text-sm font-mono font-semibold text-slate-200 mt-1">{result.total_tokens}</div>
                  </div>
                  <div className="px-4 py-3 rounded-lg bg-black/40 border border-white/[0.04]">
                    <div className="text-[8px] font-mono text-slate-600 uppercase tracking-wider">Model</div>
                    <div className="text-[11px] font-mono font-semibold text-slate-400 mt-1 truncate">{result.model?.split('/').pop()}</div>
                  </div>
                </div>

                {/* Response */}
                {result.ok ? (
                  <div>
                    <div className="text-[9px] font-mono text-slate-600 uppercase tracking-wider mb-1.5">Response</div>
                    <div className="px-4 py-3 rounded-lg bg-black/40 border border-white/[0.04]">
                      <p className="text-xs font-mono text-slate-300 whitespace-pre-wrap break-all">{result.response || '(empty)'}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-slate-600">
                      <span>↑ {result.prompt_tokens} prompt</span>
                      <span>↓ {result.completion_tokens} completion</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-[9px] font-mono text-slate-600 uppercase tracking-wider mb-1.5">Error</div>
                    <div className="px-4 py-3 rounded-lg bg-red-950/20 border border-red-900/40">
                      <p className="text-xs font-mono text-red-400/90 break-all">{result.error || 'Unknown error'}</p>
                    </div>
                  </div>
                )}

                <button onClick={() => setResult(null)}
                  className="px-4 py-2 rounded-lg text-[10px] font-mono text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all">
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-white/[0.06] rounded-xl bg-[#0a0f1e]/60 backdrop-blur-xl p-12 text-center"
              style={{ boxShadow: 'inset 0 1px 0 rgba(6,182,212,0.06), 0 0 20px rgba(6,182,212,0.03)' }}>
              <div className="text-xs font-mono text-slate-600">Select a model and click Test</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
