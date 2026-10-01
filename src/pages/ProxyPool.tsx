import { useState, useEffect } from 'react'
import { apiFetch } from '../api'
import { Loading } from '../components/Loading'
import { ErrorBox } from '../components/ErrorBox'

interface Proxy {
  id: string
  label: string
  protocol: string
  host: string
  port: number
  username: string | null
  password: string | null
  country: string | null
  is_active: number
  usage_count: number
  last_used: string | null
  created_at: string
}

const empty = { label: '', protocol: 'http', host: '', port: 8080, username: '', password: '', country: '' }

export default function ProxyPool() {
  const [proxies, setProxies] = useState<Proxy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Proxy | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    apiFetch('/proxies').then(r => r.ok ? r.json() : []).then(setProxies).catch(e => setError(e.message)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openCreate = () => { setEditing(null); setForm(empty); setShowForm(true) }
  const openEdit = (p: Proxy) => {
    setEditing(p)
    setForm({ label: p.label, protocol: p.protocol, host: p.host, port: p.port, username: p.username || '', password: p.password || '', country: p.country || '' })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.label.trim() || !form.host.trim()) return
    setSaving(true)
    const body = {
      label: form.label.trim(), protocol: form.protocol, host: form.host.trim(), port: Number(form.port),
      username: form.username.trim() || null, password: form.password.trim() || null, country: form.country.trim() || null,
    }
    try {
      if (editing) {
        await apiFetch(`/proxies/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        await apiFetch('/proxies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      setShowForm(false)
      load()
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  const toggle = async (id: string) => { await apiFetch(`/proxies/${id}/toggle`, { method: 'POST' }); load() }
  const del = async (id: string) => { await apiFetch(`/proxies/${id}`, { method: 'DELETE' }); setConfirmDel(null); load() }

  if (loading) return <div className="space-y-6"><h1 className="heading-brutal text-3xl uppercase tracking-tight">PROXY POOL</h1><Loading /></div>
  if (error) return <div className="space-y-6"><h1 className="heading-brutal text-3xl uppercase tracking-tight">PROXY POOL</h1><ErrorBox message={error} onRetry={load} /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="heading-brutal text-3xl uppercase tracking-tight">PROXY POOL</h1>
          <p className="text-lg font-medium text-subtext">{proxies.length} proxies</p>
        </div>
        <button onClick={openCreate} className="brutal-btn bg-[#ff3d81] text-on-accent px-4 py-2 text-sm font-bold">+ Add Proxy</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {proxies.map(p => (
          <div key={p.id} className={`brutal-card p-5 ${!p.is_active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full border-2 border-line ${p.is_active ? 'bg-[#3ddc97]' : 'bg-muted'}`} />
                <div>
                  <h2 className="text-sm font-bold text-ink">{p.label}</h2>
                  <p className="text-[10px] mono-brutal text-subtext mt-0.5">{p.protocol} · {p.host}:{p.port}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggle(p.id)}
                  className={`relative w-10 h-5 rounded-full border-2 border-line transition-colors ${p.is_active ? 'bg-[#3ddc97]' : 'bg-muted'}`}
                  title={p.is_active ? 'Active' : 'Inactive'}>
                  <div className={`absolute top-0 left-0 w-4 h-4 rounded-full bg-surface border-2 border-line transition-transform ${p.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                <button onClick={() => openEdit(p)}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-subtext/70 hover:text-primary-text hover:bg-[#ff3d81]/10 transition-all border-2 border-transparent hover:border-[#ff3d81]">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                {confirmDel === p.id ? (
                  <button onClick={() => del(p.id)} className="w-7 h-7 flex items-center justify-center rounded-md text-danger-text bg-[#ff6b5e]/10 border-2 border-[#ff6b5e] text-xs font-bold">✓</button>
                ) : (
                  <button onClick={() => setConfirmDel(p.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-subtext/70 hover:text-danger-text hover:bg-[#ff6b5e]/10 transition-all border-2 border-transparent hover:border-[#ff6b5e]">✕</button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] mono-brutal">
              {p.country && <span className="status-pill px-2 py-0.5 rounded border-2 border-line bg-muted text-subtext">{p.country}</span>}
              <span className="px-2 py-0.5 rounded border-2 border-line bg-muted text-subtext">uses: {p.usage_count}</span>
              {p.username && <span className="px-2 py-0.5 rounded border-2 border-line bg-muted text-subtext">auth</span>}
            </div>
          </div>
        ))}
        {proxies.length === 0 && (
          <div className="col-span-2 brutal-card border-dashed py-16 text-center text-sm mono-brutal text-subtext">
            No proxies yet. Click "+ Add Proxy" to create one.
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 p-4 pt-[10vh] sm:pt-0 overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md brutal-card p-5 sm:p-6 my-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-sm font-bold text-ink mb-4">{editing ? 'Edit Proxy' : 'Add Proxy'}</h2>
            <div className="space-y-3">
              <input type="text" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Label"
                className="w-full px-3 py-2.5 border-2 border-line rounded-lg text-sm mono-brutal bg-surface placeholder:text-subtext/70 focus:outline-none focus:ring-2 focus:ring-primary" />
              <select value={form.protocol} onChange={e => setForm({ ...form, protocol: e.target.value })}
                className="w-full px-3 py-2.5 border-2 border-line rounded-lg text-sm mono-brutal bg-surface focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="http">http</option>
                <option value="https">https</option>
                <option value="socks5">socks5</option>
              </select>
              <div className="flex gap-2">
                <input type="text" value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} placeholder="Host"
                  className="flex-1 min-w-0 px-3 py-2.5 border-2 border-line rounded-lg text-sm mono-brutal bg-surface placeholder:text-subtext/70 focus:outline-none focus:ring-2 focus:ring-primary" />
                <input type="number" value={form.port} onChange={e => setForm({ ...form, port: Number(e.target.value) })} placeholder="Port"
                  className="w-20 sm:w-24 px-3 py-2.5 border-2 border-line rounded-lg text-sm mono-brutal bg-surface placeholder:text-subtext/70 focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="Username (optional)"
                  className="w-full px-3 py-2.5 border-2 border-line rounded-lg text-sm mono-brutal bg-surface placeholder:text-subtext/70 focus:outline-none focus:ring-2 focus:ring-primary" />
                <input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Password (optional)"
                  className="w-full px-3 py-2.5 border-2 border-line rounded-lg text-sm mono-brutal bg-surface placeholder:text-subtext/70 focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <input type="text" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="Country (optional)"
                className="w-full px-3 py-2.5 border-2 border-line rounded-lg text-sm mono-brutal bg-surface placeholder:text-subtext/70 focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="flex items-center gap-3 mt-5">
              <button onClick={save} disabled={saving || !form.label.trim() || !form.host.trim()}
                className="brutal-btn flex-1 py-2.5 text-sm font-bold bg-[#ff3d81] text-on-accent disabled:opacity-40">
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
              <button onClick={() => setShowForm(false)} className="brutal-btn bg-surface text-ink px-4 py-2.5 text-sm font-bold">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
