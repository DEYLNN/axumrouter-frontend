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
          className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full bg-[#ff6b5e] hover:bg-[#ff6b5e]/80 flex items-center justify-center text-[10px] text-white border-2 border-line opacity-0 group-hover:opacity-100 transition-opacity">×</button>
        <Link to={`/admin/providers/${p.id}`}
          className="block brutal-card p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center border-2 border-line bg-muted">
                <img src={CUSTOM_ICON} alt="" className="w-full h-full p-1 object-contain rounded-lg" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-ink leading-tight">{p.name}</h2>
                <span className="text-[10px] mono-brutal text-subtext mt-0.5 block">{p.id}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full border border-line ${active ? 'bg-[#3ddc97]' : 'bg-muted'}`} />
              <svg className="w-3.5 h-3.5 text-subtext/70 group-hover:text-ink transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
            </div>
          </div>
          <div className="flex items-center gap-5 text-[11px] mono-brutal">
            <div><span className="text-ink font-bold">{p.active_keys}</span><span className="text-subtext ml-1.5">active</span></div>
            <div className="text-subtext">{p.total_keys} total</div>
            <div className="text-subtext">{modelCount} models</div>
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
        className="block brutal-card p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center border-2 border-line bg-muted">
              {p.icon_name ? <img src={iconUrl(p.icon_name)} alt="" className="w-full h-full p-1 object-contain rounded-lg" /> : <span className="text-sm font-semibold mono-brutal" style={{ color: p.color || '#6366F1' }}>{p.display_name.charAt(0)}</span>}
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink leading-tight">{p.display_name}</h2>
              <span className="text-[10px] mono-brutal text-subtext mt-0.5 block">{p.id}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full border border-line ${active ? 'bg-[#3ddc97]' : 'bg-muted'}`} />
            <svg className="w-3.5 h-3.5 text-subtext/70 group-hover:text-ink transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
          </div>
        </div>
        <div className="flex items-center gap-5 text-[11px] mono-brutal">
          <div><span className="text-ink font-bold">{p.active_keys}</span><span className="text-subtext ml-1.5">active</span></div>
          <div className="text-subtext">{p.total_keys} total</div>
          <div className="text-subtext">{p.model_count} models</div>
          {p.locked_keys > 0 && <div className="text-danger-text font-bold">{p.locked_keys} locked</div>}
        </div>
      </Link>
    )
  }

  const apikeyCards = []
  for (const p of apikeyShow) {
    const active = (p.total_keys || 0) > 0
    apikeyCards.push(
      <Link key={p.id} to={`/admin/providers/${p.id}`}
        className="block brutal-card p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center border-2 border-line bg-muted">
              {p.icon_name ? <img src={iconUrl(p.icon_name)} alt="" className="w-full h-full p-1 object-contain rounded-lg" /> : <span className="text-sm font-semibold mono-brutal" style={{ color: p.color || '#6366F1' }}>{p.display_name.charAt(0)}</span>}
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink leading-tight">{p.display_name}</h2>
              <span className="text-[10px] mono-brutal text-subtext mt-0.5 block">{p.id}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full border border-line ${active ? 'bg-[#3ddc97]' : 'bg-muted'}`} />
            <svg className="w-3.5 h-3.5 text-subtext/70 group-hover:text-ink transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
          </div>
        </div>
        <div className="flex items-center gap-5 text-[11px] mono-brutal">
          <div><span className="text-ink font-bold">{p.active_keys}</span><span className="text-subtext ml-1.5">active</span></div>
          <div className="text-subtext">{p.total_keys} total</div>
          <div className="text-subtext">{p.model_count} models</div>
          {p.locked_keys > 0 && <div className="text-danger-text font-bold">{p.locked_keys} locked</div>}
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
              <h1 className="heading-brutal text-3xl uppercase tracking-tight">PROVIDERS</h1>
              <p className="text-lg font-medium text-subtext">{providers.length + (custom?.length || 0)} providers</p>
            </div>
            <button onClick={() => setShowModal(true)}
              className="brutal-btn bg-[#ff3d81] text-on-accent px-3 sm:px-4 py-2 text-sm font-bold whitespace-nowrap">
              <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              <span className="hidden sm:inline">+ OpenAI-Compatible</span>
            </button>
          </div>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search providers..."
            className="w-full px-4 py-2.5 border-2 border-line rounded-lg font-mono text-sm bg-surface placeholder:text-subtext/70 focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
        </div>

        {noResults ? (
          <div className="brutal-card p-12 text-center text-sm font-mono text-subtext">No providers match &ldquo;{search}&rdquo;</div>
        ) : (
          <>
            {customCards.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-subtext">CUSTOM</h2>
                  <div className="flex-1 h-0.5 bg-line" />
                  <span className="text-xs font-mono text-subtext">{customCards.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{customCards}</div>
              </div>
            )}
            {oauthCards.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-subtext">OAUTH</h2>
                  <div className="flex-1 h-0.5 bg-line" />
                  <span className="text-xs font-mono text-subtext">{oauthCards.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{oauthCards}</div>
              </div>
            )}
            {apikeyCards.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-subtext">API KEY</h2>
                  <div className="flex-1 h-0.5 bg-line" />
                  <span className="text-xs font-mono text-subtext">{apikeyCards.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{apikeyCards}</div>
                {!showAll && apikey.length > LIMIT && (
                  <button onClick={() => setShowAll(true)}
                    className="brutal-btn mt-4 w-full bg-surface text-ink px-4 py-2.5 text-sm font-bold">
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
            <div className="flex items-center gap-3 pb-3 border-b-2 border-line">
              <div className="w-8 h-8 rounded-lg bg-[#c8a2ff] border-2 border-line flex items-center justify-center">
                <svg className="w-4 h-4 text-ink" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-ink">New OpenAI-Compatible Provider</h2>
                <p className="text-[10px] mono-brutal text-subtext">Connect any OpenAI-compatible API</p>
              </div>
            </div>
            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] mono-brutal text-subtext block mb-1.5">Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="My Provider"
                  className="w-full px-3.5 py-2.5 border-2 border-line rounded-lg text-sm bg-surface placeholder:text-subtext/70 focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
              </div>
              <div>
                <label className="text-[10px] mono-brutal text-subtext block mb-1.5">Prefix <span className="text-subtext/70">(ID: custom_{form.prefix || '…'})</span></label>
                <div className="flex gap-2">
                  <input value={form.prefix} onChange={e => { setForm(f => ({ ...f, prefix: e.target.value })); setPrefixCheck('idle') }}
                    placeholder="my-provider"
                    className="flex-1 px-3.5 py-2.5 border-2 border-line rounded-lg text-sm bg-surface placeholder:text-subtext/70 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-mono" />
                  <button onClick={async () => {
                    if (!form.prefix.trim()) return
                    try {
                      const c = await listCustomProviders()
                      const exists = c.some(p => p.id === `custom_${form.prefix}`)
                      setPrefixCheck(exists ? 'taken' : 'ok')
                    } catch { setPrefixCheck('idle') }
                  }}
                    className="brutal-btn bg-surface text-ink px-3 py-2.5 text-xs font-bold whitespace-nowrap">
                    Check
                  </button>
                  {prefixCheck === 'ok' && <span className="inline-flex items-center text-success-text text-[11px] font-bold">✓</span>}
                  {prefixCheck === 'taken' && <span className="inline-flex items-center text-danger-text text-[11px] font-bold">✗ Taken</span>}
                </div>
              </div>
              <div>
                <label className="text-[10px] mono-brutal text-subtext block mb-1.5">Base URL</label>
                <input value={form.base_url} onChange={e => setForm(f => ({ ...f, base_url: e.target.value }))}
                  placeholder="https://api.example.com/v1"
                  className="w-full px-3.5 py-2.5 border-2 border-line rounded-lg text-sm bg-surface placeholder:text-subtext/70 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] mono-brutal text-subtext block mb-1.5">Validate URL <span className="text-subtext/70">(optional)</span></label>
                  <input value={form.validate_url} onChange={e => setForm(f => ({ ...f, validate_url: e.target.value }))}
                    placeholder="https://api.example.com/v1/models"
                    className="w-full px-3.5 py-2.5 border-2 border-line rounded-lg text-sm bg-surface placeholder:text-subtext/70 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-mono" />
                </div>
                <div>
                  <label className="text-[10px] mono-brutal text-subtext block mb-1.5">Timeout <span className="text-subtext/70">(sec)</span></label>
                  <input type="number" value={form.timeout_secs} onChange={e => setForm(f => ({ ...f, timeout_secs: +e.target.value }))}
                    className="w-full px-3.5 py-2.5 border-2 border-line rounded-lg text-sm bg-surface placeholder:text-subtext/70 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-mono" />
                </div>
              </div>
              <div>
                <label className="text-[10px] mono-brutal text-subtext block mb-1.5">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-lg border-2 border-line transition-all ${form.color === c ? 'ring-2 ring-[#ff3d81] scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="border-t-2 border-line pt-3.5">
                <label className="text-[10px] mono-brutal text-subtext block mb-1.5">Initial Model <span className="text-subtext/70">(optional)</span></label>
                <div className="flex gap-2">
                  <input value={form.model_id} onChange={e => setForm(f => ({ ...f, model_id: e.target.value }))}
                    placeholder="model-name"
                    className="flex-1 px-3.5 py-2.5 border-2 border-line rounded-lg text-sm bg-surface placeholder:text-subtext/70 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-mono" />
                  <input type="number" value={form.ctx} onChange={e => setForm(f => ({ ...f, ctx: +e.target.value }))}
                    className="w-24 px-3.5 py-2.5 border-2 border-line rounded-lg text-sm bg-surface placeholder:text-subtext/70 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-mono" placeholder="ctx" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setShowModal(false)} className="brutal-btn bg-surface text-ink px-4 py-2 text-sm font-bold">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !form.prefix || !form.name || !form.base_url}
                className="brutal-btn bg-[#ff3d81] text-on-accent px-5 py-2 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed">
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
