import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listUnslothModels, createUnslothModel, updateUnslothModel, deleteUnslothModel, testModel, iconUrl, apiFetch } from '../../api'
import type { UnslothModel, TestResult } from '../../api'
import Modal from '../../components/Modal'

const C = {
  ink: 'var(--ink)',
  primary: '#ff3d81',
  success: '#3ddc97',
  accent: '#6366F1',
  danger: '#ff6b5e',
}

const empty = { id: '', label: '', base_url: '', api_key: '', upstream_model: '', context_length: 128000, supports_tools: false, supports_vision: false }

export default function UnslothDetail() {
  const [models, setModels] = useState<UnslothModel[]>([])
  const [loading, setLoading] = useState(true)
  const [show, setShow] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [disabledModels, setDisabledModels] = useState<Set<string>>(new Set())
  const [testing, setTesting] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})

  const reload = async () => {
    try {
      const rows = await listUnslothModels()
      setModels(rows)
    } catch (e) { console.error('[unsloth] reload error:', e) }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [rows, disabledRes] = await Promise.all([
          listUnslothModels(),
          apiFetch('/models/disabled').then(r => r.json()) as Promise<string[]>,
        ])
        if (!cancelled) {
          setModels(rows)
          setDisabledModels(new Set(disabledRes.filter((id: string) => id.startsWith('uns/'))))
          setLoading(false)
        }
      } catch (e) {
        console.error('[unsloth] load error:', e)
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const openCreate = () => { setForm(empty); setEditId(null); setShow(true) }
  const openEdit = (m: UnslothModel) => {
    setForm({ id: m.id, label: m.label, base_url: m.base_url, api_key: m.api_key, upstream_model: m.upstream_model, context_length: m.context_length, supports_tools: !!m.supports_tools, supports_vision: !!m.supports_vision })
    setEditId(m.id); setShow(true)
  }

  const save = async () => {
    if (!form.label || !form.base_url || !form.api_key || !form.upstream_model) {
      alert('All 4 fields are required')
      return
    }
    setSaving(true)
    try {
      if (editId) await updateUnslothModel(editId, form)
      else await createUnslothModel({ ...form, id: form.id || form.label.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 30) })
      setShow(false); reload()
    } catch (e) { alert(String(e)) }
    setSaving(false)
  }

  const toggleModel = async (modelId: string, enabled: boolean) => {
    const fullId = `uns/${modelId}`
    try {
      await apiFetch('/models/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model_id: fullId, enabled }) })
      setDisabledModels(prev => {
        const next = new Set(prev)
        if (enabled) next.delete(fullId)
        else next.add(fullId)
        return next
      })
    } catch (e) { console.error('[unsloth] toggle error:', e) }
  }

  const testEndpoint = async (modelId: string) => {
    setTesting(modelId)
    try {
      const result = await testModel('uns', `uns/${modelId}`)
      setTestResults(prev => ({ ...prev, [modelId]: result }))
    } catch (e) {
      setTestResults(prev => ({ ...prev, [modelId]: { ok: false, response: '', model: modelId, latency_ms: 0, prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, error: String(e) } }))
    }
    setTesting(null)
  }

  const del = async (modelId: string) => {
    if (!confirm(`Delete "${modelId}"?`)) return
    await deleteUnslothModel(modelId); reload()
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-sm mono-brutal text-subtext animate-pulse">LOADING...</div>
    </div>
  )

  const activeCount = models.filter(m => m.is_active).length

  return (
    <div className="space-y-6 max-w-3xl">
      {/* BACK LINK */}
      <Link to="/admin/providers" className="inline-flex items-center gap-1.5 text-xs mono-brutal text-subtext hover:text-ink transition-colors mb-4 font-bold">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M19 12H5m7-7l-7 7 7 7" />
        </svg>
        Back to providers
      </Link>

      {/* HERO HEADER */}
      <div className="brutal-card overflow-hidden">
        <div className="h-1.5 border-b-2 border-line" style={{ backgroundColor: C.accent }} />
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 relative">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center border-2 border-line shrink-0 shadow-[2px_2px_0px_0px_var(--shadow)]" style={{ backgroundColor: `${C.accent}20` }}>
            <img src={iconUrl('unsloth.png')} alt="" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="heading-brutal text-xl sm:text-2xl uppercase tracking-tight">UNSLOTH</h1>
              <span className="text-[10px] mono-brutal px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border-2 border-line font-bold" style={{ backgroundColor: `${C.accent}25` }}>
                uns
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-2.5 mt-2 flex-wrap">
              <span className="text-[9px] sm:text-[10px] mono-brutal px-2 sm:px-2.5 py-0.5 rounded-full border-2 border-line font-bold" style={{ backgroundColor: '#ffd23f' }}>
                MANUAL
              </span>
              <span className="text-[10px] mono-brutal text-subtext">
                <b className="text-ink">{models.length}</b> endpoints
              </span>
              <span className="text-subtext/70">·</span>
              <span className="text-[10px] mono-brutal text-subtext">
                <b className="text-ink">{activeCount}</b> active
              </span>
            </div>
            <div className="mt-2">
              <span className="text-[9px] sm:text-[10px] mono-brutal text-subtext inline-block bg-muted px-2 py-0.5 rounded border-2 border-line">
                Each endpoint = base URL + API key + upstream model
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="brutal-card p-3 sm:p-4 text-center">
          <div className="text-lg sm:text-xl font-bold mono-brutal" style={{ color: C.success }}>{activeCount}</div>
          <div className="text-[9px] sm:text-[10px] mono-brutal text-subtext uppercase mt-1">Active</div>
        </div>
        <div className="brutal-card p-3 sm:p-4 text-center">
          <div className="text-lg sm:text-xl font-bold mono-brutal" style={{ color: C.accent }}>{models.length}</div>
          <div className="text-[9px] sm:text-[10px] mono-brutal text-subtext uppercase mt-1">Endpoints</div>
        </div>
        <div className="brutal-card p-3 sm:p-4 text-center">
          <div className="text-lg sm:text-xl font-bold mono-brutal" style={{ color: C.primary }}>{models.filter(m => m.supports_tools).length}</div>
          <div className="text-[9px] sm:text-[10px] mono-brutal text-subtext uppercase mt-1">Tools</div>
        </div>
      </div>

      {/* ENDPOINTS CARD */}
      <div className="brutal-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b-2 border-line">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: C.primary }} />
            <h2 className="text-xs font-bold uppercase tracking-wider text-subtext">Endpoints</h2>
            <span className="text-[10px] mono-brutal px-2 py-0.5 rounded-full border-2 border-line font-bold">{models.length}</span>
          </div>
          <button onClick={openCreate} className="brutal-btn bg-[#ff3d81] text-on-accent px-3 py-1.5 text-[11px] font-bold">
            + Add Endpoint
          </button>
        </div>

        {models.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <img src={iconUrl('unsloth.png')} alt="" className="w-12 h-12 mx-auto mb-3 object-contain opacity-50" />
            <p className="text-subtext text-sm">No endpoints yet.</p>
          </div>
        ) : (
          <div className="divide-y-2 divide-line">
            {models.map(m => {
              const fullId = `uns/${m.id}`
              const isEnabled = !disabledModels.has(fullId)
              const tr = testResults[m.id]
              return (
              <div key={m.id} className="px-4 sm:px-5 py-3 sm:py-3.5 group hover:bg-canvas transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold text-ink">{m.label}</span>
                      <span className="text-[9px] mono-brutal text-subtext bg-muted px-1.5 py-0.5 rounded border border-line">uns/{m.id}</span>
                      <div className="w-2 h-2 rounded-full border border-line" style={{ background: m.is_active ? C.success : C.danger }} />
                      {!!m.supports_tools && <span className="text-[8px] mono-brutal text-success-text bg-success/10 px-1.5 py-0.5 rounded border border-success/20">tools</span>}
                      {!!m.supports_vision && <span className="text-[8px] mono-brutal text-accent-text bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20">vision</span>}
                      <span className={`text-[8px] mono-brutal px-1.5 py-0.5 rounded border ${isEnabled ? 'text-success-text bg-success/10 border-success/20' : 'text-danger-text bg-danger/10 border-danger/20'}`}>
                        {isEnabled ? 'enabled' : 'disabled'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 text-[10px] mono-brutal text-subtext flex-wrap">
                      <span className="truncate max-w-[180px] sm:max-w-none" title={m.base_url}>{m.base_url}</span>
                      <span className="text-subtext/70">→</span>
                      <span className="text-ink truncate">{m.upstream_model}</span>
                      <span className="text-subtext/70">·</span>
                      <span>ctx {m.context_length.toLocaleString()}</span>
                    </div>
                    {tr && (
                      <div className={`mt-2 text-[10px] mono-brutal px-2 py-1.5 rounded border ${tr.ok ? 'text-success-text bg-success/10 border-success/20' : 'text-danger-text bg-danger/10 border-danger/20'}`}>
                        {tr.ok ? `✓ ${tr.response.slice(0, 80)} (${tr.latency_ms}ms, ${tr.total_tokens} tokens)` : `✗ ${tr.error || 'Failed'}`}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button onClick={() => testEndpoint(m.id)} disabled={testing === m.id}
                      className="brutal-btn bg-surface text-ink px-2.5 py-1.5 text-[10px] font-bold disabled:opacity-50">
                      {testing === m.id ? '...' : 'Test'}
                    </button>
                    <button onClick={() => toggleModel(m.id, !isEnabled)}
                      className={`relative w-9 h-5 rounded-full transition-all border-2 border-line ${isEnabled ? 'bg-[#3ddc97]' : 'bg-muted'}`}>
                      <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-surface border border-line transition-all ${isEnabled ? 'left-[16px]' : 'left-[2px]'}`} />
                    </button>
                    <button onClick={() => openEdit(m)} className="brutal-btn bg-surface text-ink px-2.5 py-1.5 text-[10px] font-bold">Edit</button>
                    <button onClick={() => del(m.id)} className="brutal-btn bg-surface text-danger-text px-2.5 py-1.5 text-[10px] font-bold">Delete</button>
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL */}
      <Modal open={show} onClose={() => setShow(false)} maxWidth="max-w-lg">
        <div className="flex items-center gap-3 mb-4">
          <img src={iconUrl('unsloth.png')} alt="" className="w-8 h-8 object-contain" />
          <h2 className="heading-brutal text-lg text-ink">{editId ? 'EDIT ENDPOINT' : 'ADD ENDPOINT'}</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] mono-brutal text-subtext block mb-1">
              Label <span className="text-danger-text">*</span>
              <span className="text-subtext/70 ml-1">(model ID: uns/{editId || 'auto'})</span>
            </label>
            <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="My Local Model"
              className="w-full px-3 py-2 border-2 border-line rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-[10px] mono-brutal text-subtext block mb-1">
              Base URL <span className="text-danger-text">*</span>
            </label>
            <input value={form.base_url} onChange={e => setForm({ ...form, base_url: e.target.value })} placeholder="https://try.unsloth.com/v1"
              className="w-full px-3 py-2 border-2 border-line rounded-lg text-sm mono-brutal bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-[10px] mono-brutal text-subtext block mb-1">
              API Key <span className="text-danger-text">*</span>
            </label>
            <input value={form.api_key} onChange={e => setForm({ ...form, api_key: e.target.value })} placeholder="sk-..." type="password"
              className="w-full px-3 py-2 border-2 border-line rounded-lg text-sm mono-brutal bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-[10px] mono-brutal text-subtext block mb-1">
              Upstream Model <span className="text-danger-text">*</span>
            </label>
            <input value={form.upstream_model} onChange={e => setForm({ ...form, upstream_model: e.target.value })} placeholder="deepseek-v4-flash"
              className="w-full px-3 py-2 border-2 border-line rounded-lg text-sm mono-brutal bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-[10px] mono-brutal text-subtext block mb-1">Context Length</label>
              <input value={form.context_length} onChange={e => setForm({ ...form, context_length: Number(e.target.value) || 128000 })} type="number"
                className="w-full px-3 py-2 border-2 border-line rounded-lg text-sm mono-brutal bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <input type="checkbox" checked={form.supports_tools} onChange={e => setForm({ ...form, supports_tools: e.target.checked })} className="w-4 h-4" />
              <span className="text-[11px] font-semibold text-ink">Tools</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <input type="checkbox" checked={form.supports_vision} onChange={e => setForm({ ...form, supports_vision: e.target.checked })} className="w-4 h-4" />
              <span className="text-[11px] font-semibold text-ink">Vision</span>
            </label>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={() => setShow(false)} className="brutal-btn bg-surface text-ink px-4 py-2.5 text-sm font-bold flex-1">Cancel</button>
          <button onClick={save} disabled={saving || !form.label || !form.base_url || !form.api_key || !form.upstream_model}
            className="brutal-btn bg-[#ff3d81] text-on-accent px-4 py-2.5 text-sm font-bold flex-1 disabled:opacity-50">
            {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
