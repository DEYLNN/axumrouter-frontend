import { useEffect, useMemo, useState } from 'react'

import { apiFetch } from '../api'

interface AuthFile {
  id: string
  provider_id: string
  label: string
  key_type: string
  key_value: string
  key_preview: string
  email: string
  plan: string
  account_id: string
  has_refresh: boolean
  has_access: boolean
  expires_at: string
  is_active: boolean
  created_at: string
}

interface ProviderInfo {
  name: string
  display_name: string
  icon_url: string
  color: string
}


function fmtDate(v?: string) { return v ? new Date(v).toLocaleString() : '-' }

function parseExpiry(e: string) {
  if (!e || e === 'expired') return { label: 'Expired', expired: true, seconds: 0 }
  const t = Date.parse(e.replace('Z', '+00:00'))
  if (isNaN(t)) return { label: e, expired: false, seconds: 0 }
  const s = Math.max(0, Math.floor((t - Date.now()) / 1000))
  if (s <= 0) return { label: 'Expired', expired: true, seconds: 0 }
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  return {
    label: d > 0 ? `${d}d ${h}h` : `${h}h`,
    expired: false,
    seconds: s,
  }
}

export default function AuthFiles() {
  const [files, setFiles] = useState<AuthFile[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [providerFilter, setProviderFilter] = useState('all')
  const [onlyProblem, setOnlyProblem] = useState(false)
  const [onlyDisabled, setOnlyDisabled] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [providerOpen, setProviderOpen] = useState(false)
  const [providerMeta, setProviderMeta] = useState<Map<string, ProviderInfo>>(new Map())

  const getMeta = (id: string): ProviderInfo =>
    providerMeta.get(id) || { name: id.toUpperCase(), display_name: id.toUpperCase(), icon_url: '', color: '#6366F1' }

  const load = async () => {
    setLoading(true)
    const [af, pm] = await Promise.all([
      apiFetch('/admin/api/auth-files').then(r => r.json()),
      apiFetch('/admin/api/providers').then(r => r.json()).catch(() => []),
    ])
    setFiles(af.files || [])
    const m = new Map<string, ProviderInfo>()
    for (const p of Array.isArray(pm) ? pm : []) {
      m.set(p.id, { name: p.display_name || p.name || p.id, display_name: p.display_name || p.name || p.id, icon_url: p.icon_url || '', color: p.color || '#6366F1' })
    }
    setProviderMeta(m)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const providerTypes = useMemo(() => {
    const m = new Map<string, { id: string; name: string; count: number }>()
    for (const f of files) {
      const meta = getMeta(f.provider_id)
      const cur = m.get(f.provider_id) || { id: f.provider_id, name: meta.name, count: 0 }
      cur.count++
      m.set(f.provider_id, cur)
    }
    return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [files])

  const filtered = useMemo(() => {
    const needle = query.toLowerCase().trim()
    return files
      .filter(f => providerFilter === 'all' || f.provider_id === providerFilter)
      .filter(f => !onlyProblem || (f.key_type?.toLowerCase() === 'oauth' && (!f.has_access || !f.is_active)))
      .filter(f => !onlyDisabled || !f.is_active)
      .filter(f => !needle || [f.provider_id, f.label, f.email, f.key_type].some(v => v?.toLowerCase().includes(needle)))
  }, [files, query, providerFilter, onlyProblem, onlyDisabled])

  const problemCount = useMemo(() => files.filter(f => f.key_type?.toLowerCase() === 'oauth' && (!f.has_access || !f.is_active)).length, [files])
  const disabledCount = useMemo(() => files.filter(f => !f.is_active).length, [files])
  const visibleIds = useMemo(() => filtered.map(f => f.id), [filtered])
  const selectedVisible = useMemo(() => visibleIds.filter(id => selectedIds.has(id)).length, [visibleIds, selectedIds])

  const toggle = (id: string) => setSelectedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectVisible = () => setSelectedIds(p => { const n = new Set(p); visibleIds.forEach(id => n.add(id)); return n })
  const clearVisible = () => setSelectedIds(p => { const n = new Set(p); visibleIds.forEach(id => n.delete(id)); return n })

  const downloadJson = async (f: AuthFile) => {
    const res = await apiFetch(`/admin/api/auth-files/download/${f.id}`)
    if (!res.ok) { alert('Download failed'); return }
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `credential-${f.id.slice(0, 8)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const copySecret = async (key: string, val: string) => {
    try {
      await navigator.clipboard.writeText(val)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(c => c === key ? null : c), 1500)
    } catch {
      // Fallback for HTTP (non-HTTPS)
      try {
        const ta = document.createElement('textarea')
        ta.value = val
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        setCopiedKey(key)
        setTimeout(() => setCopiedKey(c => c === key ? null : c), 1500)
      } catch {
        setCopiedKey(`${key}:err`)
        setTimeout(() => setCopiedKey(c => c === `${key}:err` ? null : c), 1800)
      }
    }
  }

  const downloadTemplate = (type: 'oauth' | 'apikey') => {
    const templates = {
      oauth: [{
        provider_id: 'xai',
        key_type: 'oauth',
        email: 'user@example.com',
        access_token: 'eyJ...',
        refresh_token: 'rt_...',
        expires_in: 21600,
        scope: 'openid profile email offline_access',
      }],
      apikey: [{
        provider_id: 'mst',
        key_type: 'apikey',
        label: 'my-key',
        apiKey: 'sk-xxxxxxxxxxxxxxxxxxxxxxxx',
      }],
    }
    const json = JSON.stringify(templates[type], null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `template-${type}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setImportMsg(null)
    try {
      const parsed = await Promise.all(files.map(f => f.text().then(t => JSON.parse(t))))
      const items = parsed.flatMap(p => Array.isArray(p) ? p : Array.isArray(p.files) ? p.files : [p])
      const res = await apiFetch('/admin/auth-files/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setImportMsg({ ok: true, text: `Imported ${data.success || data.imported || items.length} file(s)` })
      await load()
    } catch (err: any) {
      setImportMsg({ ok: false, text: err.message })
    }
    e.target.value = ''
  }

  const deleteSelected = async () => {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    if (!confirm(`Delete ${ids.length} selected account(s)?`)) return
    let deleted = 0, failed = 0
    for (const id of ids) {
      try {
        const res = await apiFetch(`/admin/auth-files/delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [id] }),
        })
        await res.json()
        deleted++
      } catch { failed++ }
    }
    setImportMsg({ ok: failed === 0, text: failed ? `Deleted ${deleted}, failed ${failed}` : `Deleted ${deleted} account(s)` })
    setSelectedIds(new Set())
    await load()
  }

  // Build secrets per file for display
  const getSecrets = (f: AuthFile) => {
    const secs: { field: string; preview: string; value: string }[] = []
    let parsed: any = null
    try { parsed = JSON.parse(f.key_value) } catch { parsed = null }
    if (f.key_type?.toLowerCase() === 'oauth') {
      if (f.has_access) secs.push({
        field: 'access_token',
        preview: '••••••••',
        value: parsed?.access_token || '[stored in db]'
      })
      if (f.has_refresh) secs.push({
        field: 'refresh_token',
        preview: '••••••••',
        value: parsed?.refresh_token || '[stored in db]'
      })
    } else {
      const rawKey = parsed?.apiKey || parsed?.apiToken || parsed?.key || f.key_value
      secs.push({ field: 'api_key', preview: f.key_preview, value: rawKey })
    }
    return secs
  }

  return (
    <div className="relative">
      <div className="px-2 md:px-4 py-6 space-y-5">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent"
                style={{ textShadow: '0 0 30px rgba(6,182,212,0.3)' }}>
                AUTH FILES
              </h1>
              <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-mono text-cyan-400">{files.length}</span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5 font-mono">Provider credentials · {files.filter(f => f.is_active).length} active</p>
          </div>
          <div className="flex gap-1.5">
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-cyan-500/25 bg-cyan-500/5 px-2 sm:px-4 text-xs text-cyan-300 hover:bg-cyan-500/15 hover:border-cyan-500/40 transition-all font-mono"
              style={{ textShadow: '0 0 10px rgba(6,182,212,0.2)' }}>
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4"/></svg>
              <span className="sm:hidden">Upload</span>
              <span className="hidden sm:inline">Upload JSON</span>
              <input type="file" accept=".json" multiple className="hidden" onChange={handleImport} />
            </label>
            <button onClick={() => downloadTemplate('oauth')}
              className="h-9 flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 sm:px-3 text-[10px] text-zinc-400 hover:text-purple-300 hover:border-purple-500/30 transition-all font-mono"
              title="Download OAuth template">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/></svg>
              <span className="sm:hidden">OAUTH</span>
              <span className="hidden sm:inline">OAuth</span>
            </button>
            <button onClick={() => downloadTemplate('apikey')}
              className="h-9 flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 sm:px-3 text-[10px] text-zinc-400 hover:text-amber-300 hover:border-amber-500/30 transition-all font-mono"
              title="Download API Key template">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/></svg>
              <span className="sm:hidden">APIKEY</span>
              <span className="hidden sm:inline">API Key</span>
            </button>
            <button onClick={load} className="h-9 w-9 flex items-center justify-center rounded-xl border border-white/[0.08] text-zinc-400 hover:text-cyan-300 hover:border-cyan-500/30 transition-all font-mono text-sm shrink-0" disabled={loading}>
              {loading ? '⏳' : '↻'}
            </button>
          </div>
        </div>

        {importMsg && (
          <div className={`rounded-xl px-4 py-2.5 text-xs font-mono border ${importMsg.ok ? 'bg-emerald-500/8 text-emerald-300 border-emerald-500/25' : 'bg-red-500/8 text-red-300 border-red-500/25'}`}
            style={importMsg.ok ? { boxShadow: '0 0 15px rgba(52,211,153,0.1)' } : { boxShadow: '0 0 15px rgba(239,68,68,0.1)' }}>
            {importMsg.text}
          </div>
        )}

        {/* FILTERS */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1e]/80 backdrop-blur-xl p-4 space-y-3"
          style={{ boxShadow: 'inset 0 1px 0 rgba(6,182,212,0.06), 0 0 20px rgba(6,182,212,0.03)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter by name, type, provider..."
              className="flex-1 min-w-[200px] h-9 bg-black/50 border border-white/[0.06] rounded-lg px-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 transition-all font-mono"
              style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }} />
            
            {/* Provider dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProviderOpen(v => !v)}
                className="flex items-center gap-2 h-9 bg-black/50 border border-white/[0.06] rounded-lg px-3 text-xs text-zinc-300 hover:border-cyan-500/30 transition-all min-w-[180px] text-left font-mono"
              >
                {providerFilter !== 'all' && (
                  <div className="w-4 h-4 rounded shrink-0 overflow-hidden bg-black/60 border flex items-center justify-center"
                  style={{ borderColor: `${(getMeta(providerFilter)).color}50`, boxShadow: `0 0 6px ${(getMeta(providerFilter)).color}30` }}>
                    {(() => {
                      const fm = getMeta(providerFilter)
                      return fm.icon_url ? (
                        <img src={fm.icon_url} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <span className="font-mono text-[8px] text-zinc-400">{fm.name[0]}</span>
                      )
                    })()}
                  </div>
                )}
                <span className="flex-1 truncate">
                  {providerFilter === 'all' ? 'All providers' : getMeta(providerFilter).name}
                </span>
                <span className="text-zinc-600 text-[10px]">
                  {providerFilter === 'all' ? files.length : providerTypes.find(p => p.id === providerFilter)?.count || 0}
                </span>
                <svg className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${providerOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 9l6 6 6-6"/></svg>
              </button>

              {providerOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProviderOpen(false)} />
                  <div className="absolute left-0 right-0 z-20 mt-1.5 rounded-xl border border-white/[0.06] bg-[#0a0f1e]/95 backdrop-blur-xl shadow-2xl py-1 max-h-72 overflow-y-auto"
                    style={{ boxShadow: '0 0 30px rgba(6,182,212,0.06), 0 0 60px rgba(0,0,0,0.4)' }}>
                    <button
                      onClick={() => { setProviderFilter('all'); setProviderOpen(false) }}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors font-mono ${providerFilter === 'all' ? 'text-cyan-300 bg-cyan-500/8' : 'text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200'}`}
                    >
                      <div className="w-5 h-5 rounded bg-black/40 border border-white/[0.05] flex items-center justify-center">
                        <svg className="w-3 h-3 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 6h16M4 12h16M4 18h16"/></svg>
                      </div>
                      <span className="flex-1 text-left">All providers</span>
                      <span className="text-zinc-600">{files.length}</span>
                      {providerFilter === 'all' && <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7"/></svg>}
                    </button>
                    {providerTypes.map(p => {
                      const fm = getMeta(p.id)
                      return (
                        <button
                          key={p.id}
                          onClick={() => { setProviderFilter(p.id); setProviderOpen(false) }}
                          className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors font-mono ${providerFilter === p.id ? 'text-cyan-300 bg-cyan-500/8' : 'text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200'}`}
                        >
                          <div className="w-5 h-5 rounded shrink-0 overflow-hidden bg-black/40 border flex items-center justify-center"
                            style={{ borderColor: fm.color ? `${fm.color}50` : 'rgba(255,255,255,0.04)', boxShadow: providerFilter === p.id ? `0 0 8px ${fm.color}30` : 'none' }}>
                            {fm.icon_url ? (
                              <img src={fm.icon_url} alt="" className="w-full h-full object-contain p-0.5" />
                            ) : (
                              <span className="font-mono text-[9px] text-zinc-400">{fm.name[0]}</span>
                            )}
                          </div>
                          <span className="flex-1 text-left truncate">{p.name}</span>
                          <span className="text-zinc-600">{p.count}</span>
                          {providerFilter === p.id && <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7"/></svg>}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <button onClick={() => setOnlyProblem(v => !v)} className={`rounded-full px-3 py-1 transition-all ${onlyProblem ? 'bg-red-500/15 text-red-300 border border-red-500/30' : 'bg-white/[0.03] text-zinc-500 border border-white/[0.05] hover:bg-white/[0.06]'}`}
              style={onlyProblem ? { boxShadow: '0 0 12px rgba(239,68,68,0.15)' } : {}}>
              Problematic {problemCount}
            </button>
            <button onClick={() => setOnlyDisabled(v => !v)} className={`rounded-full px-3 py-1 transition-all ${onlyDisabled ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-white/[0.03] text-zinc-500 border border-white/[0.05] hover:bg-white/[0.06]'}`}
              style={onlyDisabled ? { boxShadow: '0 0 12px rgba(245,158,11,0.15)' } : {}}>
              Disabled {disabledCount}
            </button>
            <span className="w-px h-5 bg-white/[0.06]" />
            <button onClick={selectVisible} disabled={!visibleIds.length} className="rounded-full bg-white/[0.03] px-3 py-1 text-zinc-500 border border-white/[0.05] hover:bg-white/[0.06] disabled:opacity-40 hover:text-cyan-300 transition-all">
              Select {filtered.length}
            </button>
            <button onClick={clearVisible} disabled={!selectedVisible} className="rounded-full bg-white/[0.03] px-3 py-1 text-zinc-500 border border-white/[0.05] hover:bg-white/[0.06] disabled:opacity-40 hover:text-cyan-300 transition-all">
              Clear {selectedVisible}
            </button>
            <button onClick={deleteSelected} disabled={!selectedIds.size} className="rounded-full bg-red-500/10 px-3 py-1 text-red-400/80 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 disabled:opacity-40 transition-all"
              style={selectedIds.size ? { boxShadow: '0 0 12px rgba(239,68,68,0.1)' } : {}}>
              Delete {selectedIds.size}
            </button>
          </div>
        </div>

        {/* CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {!filtered.length && !loading && (
            <div className="col-span-full text-center py-20 text-zinc-600 text-sm font-mono">
              <span className="text-cyan-500/50">◈</span> No auth files match your filter.
            </div>
          )}
          {filtered.map(f => {
            const meta = getMeta(f.provider_id)
            const sel = selectedIds.has(f.id)
            const exp = parseExpiry(f.expires_at)
            const secrets = getSecrets(f)
            const isOAuth = f.key_type?.toLowerCase() === 'oauth'
            const problem = isOAuth && (!f.has_access || !f.is_active) ? (!f.has_access ? 'no_access' : 'disabled') : null
            const accentColor = meta.color || '#6366F1'

            return (
              <div key={f.id}
                className={`rounded-xl border transition-all duration-150 overflow-hidden ${
                  sel ? 'bg-gradient-to-b from-cyan-500/[0.04] to-transparent' : 'bg-[#0a0f1e]/60 hover:bg-[#0a0f1e]/80'
                }`}
                style={{
                  borderColor: sel ? `${accentColor}60` : 'rgba(255,255,255,0.05)',
                  boxShadow: sel
                    ? `inset 0 0 20px ${accentColor}08, 0 0 15px ${accentColor}15, 0 0 40px ${accentColor}05`
                    : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                }}
              >
                {/* HEAD */}
                <div className="p-3 flex items-start gap-3">
                  <label className="mt-1 shrink-0 cursor-pointer">
                    <input type="checkbox" checked={sel} onChange={() => toggle(f.id)}
                      className="w-3.5 h-3.5 rounded border-white/20 bg-black/40"
                      style={{ accentColor: accentColor }} />
                  </label>
                  <div className="w-9 h-9 rounded-lg shrink-0 overflow-hidden bg-black/50 border flex items-center justify-center"
                    style={{
                      borderColor: `${accentColor}40`,
                      boxShadow: `0 0 8px ${accentColor}15`,
                    }}>
                    {meta.icon_url ? (
                      <img src={meta.icon_url} alt="" className="w-full h-full object-contain p-1" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; const el = (e.target as HTMLImageElement).nextElementSibling as HTMLElement; if (el) el.style.display = 'flex' }} />
                    ) : null}
                    <div className={`w-full h-full items-center justify-center ${meta.icon_url ? 'hidden' : 'flex'}`}>
                      <span className="font-mono text-sm font-bold" style={{ color: accentColor }}>{meta.name[0]}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium truncate max-w-[120px]" style={{ color: sel ? '#e2e8f0' : '#cbd5e1' }}>{meta.name}</span>
                      <span className={`px-1.5 py-px text-[9px] rounded font-mono border ${
                        isOAuth ? 'border-purple-400/30 text-purple-300/70 bg-purple-500/6' : 'border-zinc-500/30 text-zinc-400 bg-white/[0.02]'
                      }`}>{isOAuth ? 'OAUTH' : 'API'}</span>
                      <span className={`px-1.5 py-px text-[9px] rounded font-mono ${f.is_active ? 'text-emerald-400/70 bg-emerald-500/6 border border-emerald-500/20' : 'text-red-400/60 bg-red-500/6 border border-red-500/20'}`}
                        style={f.is_active ? { boxShadow: '0 0 6px rgba(52,211,153,0.1)' } : {}}>
                        {f.is_active ? 'active' : 'disabled'}
                      </span>
                      {problem && !onlyDisabled && (
                        <span className="text-[9px] font-mono text-red-400/70 bg-red-500/6 border border-red-500/20 px-1.5 py-px rounded">problem</span>
                      )}
                    </div>
                    <div className="text-[12px] text-white/70 font-medium truncate mt-0.5" title={f.label}>{f.label || '—'}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => downloadJson(f)}
                      className="opacity-40 hover:opacity-100 transition-all p-1"
                      style={{ color: sel ? accentColor : '#71717a', textShadow: sel ? `0 0 8px ${accentColor}50` : 'none' }}
                      title="Download JSON">↓</button>
                  </div>
                </div>

                {/* OAUTH DETAILS */}
                {isOAuth && (
                  <div className="mx-3 mb-2 rounded-lg border border-white/[0.04] bg-black/30 p-2.5 space-y-1.5 text-[11px] font-mono"
                    style={{ boxShadow: 'inset 0 0 10px rgba(0,0,0,0.2)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Token expiry</span>
                      <span className={`font-mono ${exp.expired ? 'text-red-400' : 'text-zinc-300'}`}
                        style={!exp.expired ? { textShadow: '0 0 8px rgba(255,255,255,0.05)' } : {}}>
                        {exp.expired ? 'Expired' : exp.label}
                      </span>
                    </div>
                    {f.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Email</span>
                        <span className="text-zinc-300 truncate max-w-[180px]" title={f.email}>{f.email}</span>
                      </div>
                    )}
                    {f.plan && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Plan</span>
                        <span className="rounded-full bg-emerald-500/12 text-emerald-400 px-2 py-0.5 text-[9px] font-semibold"
                          style={{ boxShadow: '0 0 6px rgba(52,211,153,0.1)' }}>{f.plan}</span>
                      </div>
                    )}
                    {exp.seconds > 0 && !exp.expired && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Expires</span>
                        <span className="text-zinc-300">{fmtDate(f.expires_at)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* SECRETS */}
                <div className="mx-3 mb-2 space-y-1">
                  {secrets.map(s => (
                    <div key={s.field} className="flex items-center justify-between rounded-lg bg-black/40 border border-white/[0.03] px-2.5 py-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="text-[9px] font-mono text-zinc-500">{s.field}</div>
                        <div className="text-[10px] font-mono text-zinc-400 truncate">{s.preview}</div>
                      </div>
                      <button onClick={() => copySecret(`${f.id}:${s.field}`, s.value)}
                        className="shrink-0 ml-2 text-zinc-600 hover:text-cyan-400 transition-colors p-1"
                        style={copiedKey === `${f.id}:${s.field}` ? { color: accentColor, textShadow: `0 0 8px ${accentColor}50` } : {}}>
                        {copiedKey === `${f.id}:${s.field}` ? '✓' : copiedKey === `${f.id}:${s.field}:err` ? '✗' : '⧉'}
                      </button>
                    </div>
                  ))}
                  {!secrets.length && (
                    <div className="text-[10px] text-zinc-600 text-center py-2 font-mono">No secret fields</div>
                  )}
                </div>

                {/* ACTIONS */}
                <div className="mx-3 mb-3 grid grid-cols-2 gap-1.5">
                  <button onClick={() => downloadJson(f)}
                    className="text-[10px] py-1.5 rounded-lg border border-white/[0.06] text-zinc-400 hover:text-cyan-300 hover:border-cyan-500/30 transition-all font-mono"
                    style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
                    Download
                  </button>
                  <button onClick={async () => {
                    if (!confirm(`Delete ${f.label || f.id}?`)) return
                    try {
                      await apiFetch('/admin/auth-files/delete', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: [f.id] }),
                      })
                      setImportMsg({ ok: true, text: 'Deleted' })
                      await load()
                    } catch { setImportMsg({ ok: false, text: 'Delete failed' }) }
                  }}
                    className="text-[10px] py-1.5 rounded-lg border border-red-500/20 text-red-400/70 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/40 transition-all font-mono">
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
