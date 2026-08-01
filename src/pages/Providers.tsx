import { useState } from 'react'
import { Link } from 'react-router-dom'
import { iconUrl, getProviders, listCustomProviders, createCustomProvider, deleteCustomProvider } from '../api'
import { useAsync } from '../hooks/useAsync'
import { Loading } from '../components/Loading'
import { ErrorBox } from '../components/ErrorBox'
import Modal from '../components/Modal'

const LIMIT = 10
const CUSTOM_ICON = '/providers/custom-provider.jpg'
const COLORS = ['#6366F1','#8B5CF6','#EC4899','#F43F5E','#F97316','#22C55E','#14B8A6','#06B6D4','#0EA5E9','#2563EB','#6B7280','#000000']

export default function Providers() {
  const { data: providers, loading, error, refetch } = useAsync(getProviders, [])
  const { data: custom, refetch: refetchCustom } = useAsync(listCustomProviders, [])
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', prefix: '', base_url: '', validate_url: '', color: '#6366F1', timeout_secs: 120, model_id: '', ctx: 256000 })
  const [saving, setSaving] = useState(false)
  const [prefixCheck, setPrefixCheck] = useState<'idle' | 'ok' | 'taken'>('idle')

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} onRetry={refetch} />
  if (!providers) return null

  const filtered = providers.filter(p =>
    !search || p.display_name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase())
  )
  const customFiltered = (custom || []).filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase())
  )

  const oauth = filtered.filter(p => p.type === 'oauth').sort((a, b) => {
    if ((a.total_keys > 0) !== (b.total_keys > 0)) return a.total_keys > 0 ? -1 : 1
    return a.display_name.localeCompare(b.display_name)
  })
  const apikey = filtered.filter(p => p.type === 'apikey').sort((a, b) => {
    if ((a.total_keys > 0) !== (b.total_keys > 0)) return a.total_keys > 0 ? -1 : 1
    return a.display_name.localeCompare(b.display_name)
  })
  const apikeyShow = showAll ? apikey : apikey.slice(0, LIMIT)

  const handleCreate = async () => {
    setSaving(true)
    try {
      // Auto-check prefix
      const existing = await listCustomProviders()
      const taken = existing.some(p => p.id === `custom_${form.prefix}`)
      if (taken) {
        setPrefixCheck('taken')
        setSaving(false)
        return
      }
      setPrefixCheck('ok')
      await createCustomProvider({
        id: `custom_${form.prefix}`, name: form.name, prefix: form.prefix,
        base_url: form.base_url.trim().replace(/\/+$/, ''), validate_url: form.validate_url?.trim() || undefined,
        color: form.color, timeout_secs: form.timeout_secs,
        models: form.model_id ? [{ model_id: form.model_id, ctx: form.ctx }] : [],
      })
      setShowModal(false)
      setForm({ name: '', prefix: '', base_url: '', validate_url: '', color: '#6366F1', timeout_secs: 120, model_id: '', ctx: 256000 })
      setPrefixCheck('idle')
      refetch(); refetchCustom()
    } catch (e: any) { alert(e.message) } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete custom provider "${id}"?`)) return
    await deleteCustomProvider(id); refetch(); refetchCustom()
  }

  const customCards = []
  for (const p of customFiltered) {
    const active = (p.total_keys || 0) > 0
    const modelCount = p.models?.length ?? 0
    customCards.push(
      <div key={p.id} className="relative group">
        <button onClick={() => handleDelete(p.id)}
          className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">×</button>
        <Link to={`/admin/providers/${p.id}`}
          className="block rounded-2xl border border-white/[0.06] transition-all duration-300 bg-[#0a0f1e]/60 backdrop-blur-xl hover:border-cyan-500/30"
          style={{ boxShadow: active ? 'inset 0 0 20px rgba(6,182,212,0.03), 0 0 10px rgba(6,182,212,0.05)' : 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/[0.1] bg-black/50">
                  <img src={CUSTOM_ICON} alt="" className="w-full h-full p-1 object-contain rounded-lg" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors leading-tight">{p.name}</h2>
                  <span className="text-[10px] font-mono text-slate-600 mt-0.5 block">{p.id}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-700'}`}
                  style={active ? { boxShadow: '0 0 6px rgba(52,211,153,0.5)' } : {}} />
                <svg className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-500 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>
            <div className="flex items-center gap-5 text-[11px] font-mono">
              <div><span className="text-slate-300">{p.active_keys}</span><span className="text-slate-600 ml-1.5">active</span></div>
              <div className="text-slate-600">{p.total_keys} total</div>
              <div className="text-slate-500">{modelCount} models</div>
            </div>
          </div>
        </Link>
      </div>
    )
  }

  const oauthCards = []
  for (const p of oauth) {
    const active = (p.total_keys || 0) > 0
    oauthCards.push(
      <Link key={p.id} to={`/admin/providers/${p.id}`}
        className="block rounded-2xl border border-white/[0.06] transition-all duration-300 bg-[#0a0f1e]/60 backdrop-blur-xl hover:border-cyan-500/30"
        style={{ boxShadow: active ? 'inset 0 0 20px rgba(6,182,212,0.03), 0 0 10px rgba(6,182,212,0.05)' : 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/[0.1] bg-black/50">
                {p.icon_name ? <img src={iconUrl(p.icon_name)} alt="" className="w-full h-full p-1 object-contain rounded-lg" /> : <span className="text-sm font-semibold font-mono" style={{ color: p.color || '#6366F1' }}>{p.display_name.charAt(0)}</span>}
              </div>
              <div>
                <h2 className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors leading-tight">{p.display_name}</h2>
                <span className="text-[10px] font-mono text-slate-600 mt-0.5 block">{p.id}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-700'}`}
                style={active ? { boxShadow: '0 0 6px rgba(52,211,153,0.5)' } : {}} />
              <svg className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-500 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
            </div>
          </div>
          <div className="flex items-center gap-5 text-[11px] font-mono">
            <div><span className="text-slate-300">{p.active_keys}</span><span className="text-slate-600 ml-1.5">active</span></div>
            <div className="text-slate-600">{p.total_keys} total</div>
            <div className="text-slate-500">{p.model_count} models</div>
            {p.locked_keys > 0 && <div className="text-red-400/80">{p.locked_keys} locked</div>}
          </div>
        </div>
      </Link>
    )
  }

  const apikeyCards = []
  for (const p of apikeyShow) {
    const active = (p.total_keys || 0) > 0
    apikeyCards.push(
      <Link key={p.id} to={`/admin/providers/${p.id}`}
        className="block rounded-2xl border border-white/[0.06] transition-all duration-300 bg-[#0a0f1e]/60 backdrop-blur-xl hover:border-cyan-500/30"
        style={{ boxShadow: active ? 'inset 0 0 20px rgba(6,182,212,0.03), 0 0 10px rgba(6,182,212,0.05)' : 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/[0.1] bg-black/50">
                {p.icon_name ? <img src={iconUrl(p.icon_name)} alt="" className="w-full h-full p-1 object-contain rounded-lg" /> : <span className="text-sm font-semibold font-mono" style={{ color: p.color || '#6366F1' }}>{p.display_name.charAt(0)}</span>}
              </div>
              <div>
                <h2 className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors leading-tight">{p.display_name}</h2>
                <span className="text-[10px] font-mono text-slate-600 mt-0.5 block">{p.id}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-700'}`}
                style={active ? { boxShadow: '0 0 6px rgba(52,211,153,0.5)' } : {}} />
              <svg className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-500 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
            </div>
          </div>
          <div className="flex items-center gap-5 text-[11px] font-mono">
            <div><span className="text-slate-300">{p.active_keys}</span><span className="text-slate-600 ml-1.5">active</span></div>
            <div className="text-slate-600">{p.total_keys} total</div>
            <div className="text-slate-500">{p.model_count} models</div>
            {p.locked_keys > 0 && <div className="text-red-400/80">{p.locked_keys} locked</div>}
          </div>
        </div>
      </Link>
    )
  }

  const noResults = search && oauth.length === 0 && apikey.length === 0 && customFiltered.length === 0

  return (
    <div className="relative">
      <div className="space-y-5">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent"
                style={{ textShadow: '0 0 30px rgba(6,182,212,0.3)' }}>PROVIDERS</h1>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5">{providers.length + (custom?.length || 0)} providers</p>
            </div>
            <button onClick={() => setShowModal(true)}
              className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors px-3 py-1.5 rounded-lg border border-cyan-500/30 hover:border-cyan-500/50 whitespace-nowrap">+ OpenAI-Compatible</button>
          </div>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search providers..."
            className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2.5 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all"
            style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }} />
        </div>

        {noResults ? (
          <div className="py-12 text-center text-[10px] font-mono text-slate-600">No providers match &ldquo;{search}&rdquo;</div>
        ) : (
          <>
            {customCards.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-[10px] font-mono font-semibold uppercase tracking-[0.12em] text-slate-500">CUSTOM</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] via-cyan-500/10 to-transparent" />
                  <span className="text-[10px] font-mono text-slate-600">{customCards.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{customCards}</div>
              </div>
            )}
            {oauthCards.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-[10px] font-mono font-semibold uppercase tracking-[0.12em] text-slate-500">OAUTH</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] via-cyan-500/10 to-transparent" />
                  <span className="text-[10px] font-mono text-slate-600">{oauthCards.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{oauthCards}</div>
              </div>
            )}
            {apikeyCards.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-[10px] font-mono font-semibold uppercase tracking-[0.12em] text-slate-500">API KEY</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] via-cyan-500/10 to-transparent" />
                  <span className="text-[10px] font-mono text-slate-600">{apikeyCards.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{apikeyCards}</div>
                {!showAll && apikey.length > LIMIT && (
                  <button onClick={() => setShowAll(true)}
                    className="mt-4 w-full py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-[10px] font-mono text-slate-500 hover:text-slate-300 hover:border-white/[0.12] transition-all">
                    Show all {apikey.length - LIMIT} more providers
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <Modal open={true} onClose={() => { setShowModal(false); setPrefixCheck('idle') }} maxWidth="max-w-lg">
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.06]">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-200">New OpenAI-Compatible Provider</h2>
                <p className="text-[10px] font-mono text-slate-500">Connect any OpenAI-compatible API</p>
              </div>
            </div>
            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-mono text-slate-500 block mb-1.5">Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="My Provider"
                  className="w-full bg-black/50 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[12px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all" />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 block mb-1.5">Prefix <span className="text-slate-600">(ID: custom_{form.prefix || '…'})</span></label>
                <div className="flex gap-2">
                  <input value={form.prefix} onChange={e => { setForm(f => ({ ...f, prefix: e.target.value })); setPrefixCheck('idle') }}
                    placeholder="my-provider"
                    className="flex-1 bg-black/50 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[12px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono" />
                  <button onClick={async () => {
                    if (!form.prefix.trim()) return
                    try {
                      const c = await listCustomProviders()
                      const exists = c.some(p => p.id === `custom_${form.prefix}`)
                      setPrefixCheck(exists ? 'taken' : 'ok')
                    } catch { setPrefixCheck('idle') }
                  }}
                    className="px-3 py-2.5 text-[10px] font-mono rounded-xl border border-white/[0.08] bg-black/50 text-slate-400 hover:text-slate-200 hover:border-white/[0.15] transition-all whitespace-nowrap">
                    Check
                  </button>
                  {prefixCheck === 'ok' && <span className="inline-flex items-center text-emerald-400 text-[11px]">✓</span>}
                  {prefixCheck === 'taken' && <span className="inline-flex items-center text-red-400 text-[11px]">✗ Taken</span>}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 block mb-1.5">Base URL</label>
                <input value={form.base_url} onChange={e => setForm(f => ({ ...f, base_url: e.target.value }))}
                  placeholder="https://api.example.com/v1"
                  className="w-full bg-black/50 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[12px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 block mb-1.5">Validate URL <span className="text-slate-600">(optional)</span></label>
                  <input value={form.validate_url} onChange={e => setForm(f => ({ ...f, validate_url: e.target.value }))}
                    placeholder="https://api.example.com/v1/models"
                    className="w-full bg-black/50 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[12px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 block mb-1.5">Timeout <span className="text-slate-600">(sec)</span></label>
                  <input type="number" value={form.timeout_secs} onChange={e => setForm(f => ({ ...f, timeout_secs: +e.target.value }))}
                    className="w-full bg-black/50 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[12px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 block mb-1.5">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-xl transition-all ${form.color === c ? 'ring-2 ring-white/40 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="border-t border-white/[0.06] pt-3.5">
                <label className="text-[10px] font-mono text-slate-500 block mb-1.5">Initial Model <span className="text-slate-600">(optional)</span></label>
                <div className="flex gap-2">
                  <input value={form.model_id} onChange={e => setForm(f => ({ ...f, model_id: e.target.value }))}
                    placeholder="model-name"
                    className="flex-1 bg-black/50 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[12px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono" />
                  <input type="number" value={form.ctx} onChange={e => setForm(f => ({ ...f, ctx: +e.target.value }))}
                    className="w-24 bg-black/50 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[12px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono" placeholder="ctx" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-[11px] font-mono text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !form.prefix || !form.name || !form.base_url}
                className="px-5 py-2 text-[11px] font-mono text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20">
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Creating...
                  </span>
                ) : 'Create Provider'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
