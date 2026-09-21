import { useEffect, useMemo, useState, useRef, useCallback } from 'react'

import { iconUrl, apiFetch } from '../api'
import { copyToClipboard } from '../utils/clipboard'
import { getAuthFiles, toggleAuthFile, bulkEnableKeys, getKeysStats, dedupeKeys, refreshAuthFile } from '../api/auth-files'
import { getSchema, validateImportItem } from '../api/import-schemas'
import type { AuthFile } from '../api'

interface ProviderInfo {
  name: string
  display_name: string
  icon_name: string
  color: string
}

interface Stats {
  total: number
  active: number
  disabled: number
  providers: { provider_id: string; count: number }[] | null
  duplicates: number
}

function fmtDate(v?: string) {
  if (!v) return '-'
  const raw = v.trim()
  const numeric = Number(raw)
  const ms = Number.isFinite(numeric) && numeric > 0
    ? (numeric < 10_000_000_000 ? numeric * 1000 : numeric)
    : Date.parse(raw.replace('Z', '+00:00'))
  if (!Number.isFinite(ms)) return '-'
  return new Date(ms).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
}

function parseExpiry(e: string) {
  if (!e || !e.trim()) return { label: '∞', expired: false, infinite: true, seconds: Infinity }
  if (e === 'expired') return { label: 'Expired', expired: true, infinite: false, seconds: 0 }
  const raw = e.trim()
  const numeric = Number(raw)
  const t = Number.isFinite(numeric) && numeric > 0
    ? (numeric < 10_000_000_000 ? numeric * 1000 : numeric)
    : Date.parse(raw.replace('Z', '+00:00'))
  if (!Number.isFinite(t) || isNaN(t)) return { label: e, expired: false, infinite: false, seconds: 0 }
  const s = Math.max(0, Math.floor((t - Date.now()) / 1000))
  if (s <= 0) return { label: 'Expired', expired: true, infinite: false, seconds: 0 }
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  return {
    label: d > 0 ? `${d}d ${h}h` : `${h}h`,
    expired: false,
    infinite: false,
    seconds: s,
  }
}

export default function AuthFiles() {
  const [files, setFiles] = useState<AuthFile[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [providerFilter, setProviderFilter] = useState('all')
  const [onlyProblem, setOnlyProblem] = useState(false)
  const [onlyDisabled, setOnlyDisabled] = useState(false)
  const [statusCodeFilter, setStatusCodeFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [providerOpen, setProviderOpen] = useState(false)
  const [providerSearch, setProviderSearch] = useState('')
  const [providerMeta, setProviderMeta] = useState<Map<string, ProviderInfo>>(new Map())
  const [stats, setStats] = useState<Stats | null>(null)
  const [page, setPage] = useState(0)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Generation counter — bumped on each load() call. Old responses ignored.
  const loadGen = useRef(0)
  // Latest searchQuery ref — keeps load() callbacks honest about which query
  // they should send, even if a stale closure captured an older value.
  const searchQueryRef = useRef('')
  // Default icon/color fallback per provider ID — used when BE returns empty
  // icon_name (e.g. for custom providers or missing data). Ensures UI never
  // shows blank/gray icons for known providers.
  const providerDefaults: Record<string, { icon: string; color: string }> = {
    orc: { icon: 'orc.png', color: '#1a8cdb' },
    ocf: { icon: 'ocf.webp', color: '#E87040' },
    cf:  { icon: 'cf.png',  color: '#F38020' },
    cl:  { icon: 'cl.png',  color: '#5B9BD5' },
    kc:  { icon: 'kc.png',  color: '#FF6B35' },
  }

  const onSearchChange = useCallback((v: string) => {
    setQuery(v)
    clearTimeout(searchTimer.current ?? undefined)
    searchTimer.current = setTimeout(() => {
      searchQueryRef.current = v
      setSearchQuery(v)
    }, 300)
  }, [])

  const getMeta = useCallback((id: string): ProviderInfo => {
    const fromMap = providerMeta.get(id)
    // Trust BE response fully — name/display_name are real provider names like
    // "OrcaRouter", not uppercase IDs. Use defaults only for icon/color.
    if (fromMap && fromMap.name && fromMap.name !== fromMap.name.toUpperCase()) {
      // Real name from BE — use as-is, supplement icon/color if missing.
      const def = providerDefaults[id]
      return {
        name: fromMap.name,
        display_name: fromMap.display_name || fromMap.name,
        icon_name: fromMap.icon_name || (def?.icon ?? ''),
        color: (fromMap.color && fromMap.color !== '#6366F1') ? fromMap.color : (def?.color ?? '#6366F1'),
      }
    }
    // No real name from BE — fall back to id-based.
    const def = providerDefaults[id]
    if (def) {
      return { name: id, display_name: id, icon_name: def.icon, color: def.color }
    }
    return fromMap || { name: id, display_name: id, icon_name: '', color: '#6366F1' }
  }, [providerMeta, providerDefaults])

  const load = useCallback(async (p: number, q: string, pid: string, prob: boolean, dis: boolean, sc?: string) => {
    // Generation counter — bumped each call. Old responses discarded.
    const myGen = ++loadGen.current
    // Use ref for query — keeps behavior consistent if caller passed stale closure.
    // Fall back to `q` arg if ref is empty (initial mount).
    const effectiveQuery = q || searchQueryRef.current
    setLoading(true)
    // BE pagination: FE p (0-indexed) → BE page (1-indexed), 50/page
    const fePerPage = 50
    const bePage = p + 1
    try {
      const [bePage1, pm, ks] = await Promise.all([
        getAuthFiles({ page: bePage, per_page: fePerPage, query: effectiveQuery || undefined, provider_id: pid, only_problem: prob, only_disabled: dis, status_code: sc }),
        apiFetch('/providers').then(r => r.json()).catch(() => []),
        // Stats endpoint — counts ALL keys per provider (independent of pagination).
        // FE passes same filter knobs as keys list so counts match what's visible.
        getKeysStats({ provider_id: pid, only_problem: prob, only_disabled: dis }),
      ])
      // Drop stale response if newer load() has been called.
      if (myGen !== loadGen.current) return

      const pageData = bePage1.keys
      const totalAll = bePage1.total
      const totalAllPages = Math.ceil(totalAll / fePerPage)
      setFiles(pageData)
      setTotalPages(totalAllPages)
      setStats({
        total: totalAll,
        active: ks.active,
        disabled: ks.disabled,
        providers: ks.providers,
        duplicates: ks.duplicates,
      })
      const m = new Map<string, ProviderInfo>()
      for (const prov of Array.isArray(pm) ? pm : []) {
        m.set(prov.id, { name: prov.display_name || prov.name || prov.id, display_name: prov.display_name || prov.name || prov.id, icon_name: prov.icon_name || '', color: prov.color || '#6366F1' })
      }
      setProviderMeta(m)
    } finally {
      // Only clear loading if this is still the active load.
      if (myGen === loadGen.current) setLoading(false)
    }
  }, [])

  // Reset status code filter when leaving problematic mode, OR when provider
  // changes (codes are per-page, the selected code may not exist for new provider).
  useEffect(() => {
    setStatusCodeFilter('all')
  }, [onlyProblem, providerFilter, onlyDisabled])

  const reload = useCallback(() => {
    load(page, searchQuery, providerFilter, onlyProblem, onlyDisabled, statusCodeFilter)
  }, [page, searchQuery, providerFilter, onlyProblem, onlyDisabled, statusCodeFilter, load])

  // Single effect: reset page + load in one shot
  useEffect(() => {
    // Flush pending search debounce so latest input is used immediately
    // (otherwise filter changes race with 300ms-debounced search updates).
    if (searchTimer.current) {
      clearTimeout(searchTimer.current)
      searchTimer.current = null
      // Sync query→searchQuery if there's a pending value
      if (query !== searchQuery) {
        searchQueryRef.current = query
        setSearchQuery(query)
      }
    }
    setPage(0)
    load(0, searchQuery, providerFilter, onlyProblem, onlyDisabled, statusCodeFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, providerFilter, onlyProblem, onlyDisabled, statusCodeFilter])
  useEffect(() => {
    if (!loading) load(page, searchQuery, providerFilter, onlyProblem, onlyDisabled, statusCodeFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const providerTypes = useMemo(() => {
    if (!stats?.providers) {
      const m = new Map<string, { id: string; name: string; count: number }>()
      for (const f of files) {
        const meta = getMeta(f.provider_id)
        const cur = m.get(f.provider_id) || { id: f.provider_id, name: meta.name, count: 0 }
        cur.count++
        m.set(f.provider_id, cur)
      }
      return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name))
    }
    return stats.providers.map(p => {
      const meta = getMeta(p.provider_id)
      return { id: p.provider_id, name: meta.name, count: p.count }
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, [stats, files, getMeta])

  const isProblem = (f: AuthFile) => {
    const oauthBroken = f.key_type?.toLowerCase() === 'oauth' && (!f.has_access || !f.is_active)
    const hasUsageError = !!f.last_error_message || !!f.last_error_status
    return oauthBroken || hasUsageError
  }

  const paginated = useMemo(() => files, [files])

  const problemCount = useMemo(() => files.filter(isProblem).length, [files])
  const disabledCount = useMemo(() => files.filter(f => !f.is_active).length, [files])
  // availableCodes pulled from current page only — limitation: codes from other pages
  // won't show. Acceptable trade-off; user can browse pages to see all codes.
  // BE filter still works correctly.
  const availableCodes = useMemo(() => {
    const codes = new Set<number>()
    for (const f of files) {
      if (f.last_error_status) codes.add(f.last_error_status)
    }
    return Array.from(codes).sort()
  }, [files])
  const visibleIds = useMemo(() => paginated.map(f => f.id), [paginated])
  const selectedVisible = useMemo(() => visibleIds.filter(id => selectedIds.has(id)).length, [visibleIds, selectedIds])

  const toggle = (id: string) => setSelectedIds(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const selectVisible = () => setSelectedIds(p => { const n = new Set(p); visibleIds.forEach(id => n.add(id)); return n })
  const clearVisible = () => setSelectedIds(p => { const n = new Set(p); visibleIds.forEach(id => n.delete(id)); return n })

  const downloadJson = async (f: AuthFile) => {
    let data: Record<string, any> = {
      provider_id: f.provider_id,
      key_type: f.key_type,
      label: f.label,
    }
    // Try parse key_value as JSON for both OAuth and structured API keys (cf)
    try {
      const parsed = JSON.parse(f.key_value)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        data = { ...data, ...parsed }
        delete data.key_value
      } else {
        data.key_value = f.key_value
      }
    } catch {
      data.key_value = f.key_value
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `credential-${f.id.slice(0, 8)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const copySecret = async (key: string, val: string) => {
    const ok = await copyToClipboard(val)
    if (ok) {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(c => c === key ? null : c), 1500)
    } else {
      setCopiedKey(`${key}:err`)
      setTimeout(() => setCopiedKey(c => c === `${key}:err` ? null : c), 1800)
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
        apiKey: '«redacted»',
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
      // Fetch valid provider IDs
      const provRes: { id: string }[] = await apiFetch('/providers').then(r => r.json()).catch(() => [])
      const validIds = new Set(provRes.map(p => p.id))
      let imported = 0, skipped = 0
      const allErrors: string[] = []
      const importedItems: string[] = []
      setImportProgress({ current: 0, total: items.length })
      for (const [idx, item] of items.entries()) {
        const pid = item.provider_id || 'unknown'
        const kt = item.key_type || 'apikey'
        const schema = getSchema(pid, kt)
        if (!schema) {
          allErrors.push(`Item: no import schema for '${pid}:${kt}' — configure in import-schemas.ts first`)
          skipped++
          continue
        }
        const itemErrors = validateImportItem(item, schema, validIds)
        if (itemErrors.length > 0) {
          allErrors.push(`Item ${pid}: ${itemErrors.join('; ')}`)
          skipped++
          continue
        }
        try {
          // Build key_value from structured fields
          let kv = item.key_value
          if (!kv && item.apiKey && item.accountId) kv = JSON.stringify({ apiKey: item.apiKey, accountId: item.accountId })
          if (!kv && item.access_token) {
            const oauthFields: Record<string, any> = { access_token: item.access_token }
            if (item.email) oauthFields.email = item.email
            if (item.orgId) oauthFields.orgId = item.orgId
            if (item.refresh_token) oauthFields.refresh_token = item.refresh_token
            if (item.expires_at) oauthFields.expires_at = item.expires_at
            kv = JSON.stringify(oauthFields)
          }
          if (!kv) kv = '{}'
          await apiFetch('/keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider_id: pid,
              key_value: kv,
              label: item.label || item.email || '',
              key_type: kt,
            }),
          })
          imported++
          importedItems.push(`${pid}/${item.label || item.email || item.key_value?.slice(0, 8) || ''}`)
        } catch { skipped++ }
        setImportProgress({ current: idx + 1, total: items.length })
      }
      setImportProgress(null)
      const detail = importedItems.length > 0 ? `: ${importedItems.join(', ')}` : ''
      const msg = allErrors.length > 0
        ? `Imported ${imported}, skipped ${skipped}: ${allErrors.slice(0, 3).join(' | ')}${allErrors.length > 3 ? ` (+${allErrors.length - 3} more)` : ''}`
        : `Imported ${imported} file(s)${detail}`
      setImportMsg({ ok: imported > 0, text: msg })
      await reload()
    } catch (err: any) {
      setImportMsg({ ok: false, text: err.message })
    }
    e.target.value = ''
  }

  const downloadSelected = () => {
    const selected = paginated.filter(f => selectedIds.has(f.id))
    const items = selected.map(f => ({
      provider_id: f.provider_id,
      key_type: f.key_type || 'apikey',
      label: f.label || '',
      key_value: f.key_value,
    }))
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `auth-files-${items.length}-selected.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const deleteSelected = async () => {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    if (!confirm(`Delete ${ids.length} selected account(s)?`)) return
    // Show progress + disable re-entry
    setImportProgress({ current: 0, total: ids.length })
    setImportMsg(null)

    const BATCH = 10
    let deleted = 0, failed = 0
    try {
      // Parallel chunks — limited to BATCH concurrent to avoid DB lock / pool exhaustion.
      for (let i = 0; i < ids.length; i += BATCH) {
        const chunk = ids.slice(i, i + BATCH)
        const results = await Promise.allSettled(chunk.map(id =>
          apiFetch('/keys/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key_id: id }),
          }).then(r => r.json()).then(_ => id)
        ))
        for (const r of results) {
          if (r.status === 'fulfilled') deleted++; else failed++
        }
        setImportProgress({ current: Math.min(i + BATCH, ids.length), total: ids.length })
      }
      setImportMsg({ ok: failed === 0, text: failed ? `Deleted ${deleted}, failed ${failed}` : `Deleted ${deleted} account(s)` })
      setSelectedIds(new Set())
      await reload()
    } finally {
      setImportProgress(null)
    }
  }

  const enableSelected = async () => {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    if (!confirm(`Enable ${ids.length} selected account(s)? Error counters will be reset.`)) return
    setImportProgress({ current: 0, total: ids.length })
    setImportMsg(null)
    try {
      const res = await bulkEnableKeys(ids)
      setImportMsg({ ok: res.success, text: res.message || `Enabled ${res.enabled} key(s)` })
      setSelectedIds(new Set())
      await reload()
    } catch (err: any) {
      setImportMsg({ ok: false, text: err.message })
    } finally {
      setImportProgress(null)
    }
  }

  const runDedupe = async () => {
    // Scope to current provider filter so user can dedupe single provider or all.
    const pid = providerFilter === 'all' ? undefined : providerFilter
    const scopeLabel = pid ? `provider '${pid}'` : 'all providers'
    const expected = pid ? 'for this provider only' : 'across all providers'
    if (!confirm(`Deduplicate API keys (same provider_id + key_value)?\n\nScope: ${scopeLabel} — ${expected}.\nOAuth tokens are left untouched.\nNewest entries will be removed; oldest kept.`)) return
    setImportMsg(null)
    setImportProgress({ current: 0, total: 1 })
    try {
      const res = await dedupeKeys(pid)
      setImportProgress(null)
      setImportMsg({
        ok: res.removed > 0,
        text: res.removed > 0
          ? `Dedupe: removed ${res.removed} duplicate(s) across ${res.groups} group(s), kept ${res.kept} oldest.`
          : `Dedupe: no duplicates found. ${res.kept} unique key(s) remain.`,
      })
      await reload()
    } catch (err: any) {
      setImportProgress(null)
      setImportMsg({ ok: false, text: err.message })
    }
  }

  const getSecrets = (f: AuthFile) => {
    const secs: { field: string; preview: string; value: string }[] = []
    let parsed: any = null
    try { parsed = JSON.parse(f.key_value) } catch { parsed = null }
    if (f.key_type?.toLowerCase() === 'oauth') {
      // Add id if available
      const userId = parsed?.user?.id || parsed?.user_id || parsed?.userId
      if (userId) secs.push({ field: 'id', preview: userId.slice(0, 8) + '...', value: userId })
      const mask = (s: string) => s.length > 10 ? `${s.slice(0, 4)}...${s.slice(-4)}` : s.slice(0, 8)
      if (parsed?.access_token) secs.push({
        field: 'access_token',
        preview: mask(parsed.access_token),
        value: parsed.access_token,
      })
      if (parsed?.refresh_token) secs.push({
        field: 'refresh_token',
        preview: '••••••••',
        value: parsed.refresh_token || '[stored in db]',
      })
    } else {
      const mask = (s: string) => s.length > 10 ? `${s.slice(0, 4)}...${s.slice(-4)}` : s.slice(0, 8)
      if (parsed && parsed.accountId) {
        // Cloudflare-style: JSON with apiKey + accountId
        const apiKey = parsed.apiKey || parsed.apiToken || ''
        if (apiKey) secs.push({ field: 'api_key', preview: mask(apiKey), value: apiKey })
        secs.push({ field: 'account_id', preview: mask(parsed.accountId), value: parsed.accountId })
      } else {
        const rawKey = parsed?.apiKey || parsed?.apiToken || parsed?.key || f.key_value
        secs.push({ field: 'api_key', preview: f.key_preview, value: rawKey })
      }
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
              <h1 className="heading-brutal text-3xl uppercase tracking-tight">AUTH FILES</h1>
              <span className="status-pill bg-[#ff3d81] text-on-accent">{stats?.total ?? files.length}</span>
            </div>
            <p className="text-lg font-medium text-subtext mt-0.5">Provider credentials · {stats?.active ?? files.filter(f => f.is_active).length} active</p>
          </div>
          <div className="flex gap-1.5">
            <label className="brutal-btn inline-flex h-9 cursor-pointer items-center gap-1.5 bg-[#3ddc97] text-on-accent px-2 sm:px-4 text-xs font-bold">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4"/></svg>
              <span className="sm:hidden">Upload</span>
              <span className="hidden sm:inline">Upload JSON</span>
              <input type="file" accept=".json" multiple className="hidden" onChange={handleImport} />
            </label>
            <button onClick={() => downloadTemplate('oauth')}
              className="brutal-btn h-9 flex items-center gap-1.5 bg-surface text-ink px-2 sm:px-3 text-xs font-bold"
              title="Download OAuth template">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/></svg>
              <span className="sm:hidden">OAUTH</span>
              <span className="hidden sm:inline">OAuth</span>
            </button>
            <button onClick={() => downloadTemplate('apikey')}
              className="brutal-btn h-9 flex items-center gap-1.5 bg-surface text-ink px-2 sm:px-3 text-xs font-bold"
              title="Download API Key template">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/></svg>
              <span className="sm:hidden">APIKEY</span>
              <span className="hidden sm:inline">API Key</span>
            </button>
            <button onClick={reload} className="brutal-btn h-9 w-9 flex items-center justify-center bg-surface text-ink text-sm font-bold shrink-0" disabled={loading}>
              {loading ? '⏳' : '↻'}
            </button>
          </div>
        </div>

        {importMsg && (
          <div className={`brutal-card px-4 py-2.5 text-xs mono-brutal font-bold ${importMsg.ok ? 'border-[#3ddc97] text-success-text' : 'border-[#ff6b5e] text-danger-text'}`}>
            {importMsg.text}
          </div>
        )}

        {importProgress && (
          <div className="brutal-card px-4 py-2.5 text-xs mono-brutal">
            <div className="flex items-center gap-2 mb-1.5">
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              <span className="font-bold text-ink">Progress… {importProgress.current}/{importProgress.total}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted border-2 border-line overflow-hidden">
              <div className="h-full rounded-full bg-[#ff3d81] transition-all duration-200"
                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }} />
            </div>
          </div>
        )}

        {/* FILTERS */}
        <div className="brutal-card p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input value={query} onChange={e => onSearchChange(e.target.value)} placeholder="Filter by name, type, provider..."
              className="flex-1 min-w-[200px] h-9 px-3 border-2 border-line rounded-lg text-xs mono-brutal bg-surface placeholder:text-subtext/70 focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
            
            {/* Provider dropdown — full-width block, dropdown panel matches */}
            <div className="relative z-10 w-full">
              <button
                type="button"
                onClick={() => setProviderOpen(v => !v)}
                className="brutal-btn flex w-full items-center gap-2 h-9 bg-surface text-ink px-3 text-xs font-bold text-left"
              >
                {providerFilter !== 'all' && (
                  <div className="w-4 h-4 rounded shrink-0 overflow-hidden bg-muted border-2 border-line flex items-center justify-center">
                    {(() => {
                      const fm = getMeta(providerFilter)
                      return fm.icon_name ? (
                        <img src={iconUrl(fm.icon_name)} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <span className="mono-brutal text-[8px] text-subtext font-bold">{fm.name[0]}</span>
                      )
                    })()}
                  </div>
                )}
                <span className="flex-1 truncate">
                  {providerFilter === 'all' ? 'All providers' : getMeta(providerFilter).name}
                </span>
                <span className="text-subtext/70 text-[10px] mono-brutal">
                  {providerFilter === 'all' ? (stats?.total ?? files.length) : providerTypes.find(p => p.id === providerFilter)?.count || 0}
                </span>
                <svg className={`w-3.5 h-3.5 text-subtext/70 transition-transform ${providerOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 9l6 6 6-6"/></svg>
              </button>

              {providerOpen && (
                <>
                  <div className="fixed inset-0 z-[100]" onClick={() => setProviderOpen(false)} />
                  <div className="absolute left-0 right-0 z-[101] mt-1.5 brutal-card py-1 max-h-80 overflow-hidden flex flex-col">
                    <div className="px-2 py-1.5 border-b-2 border-line shrink-0">
                      <input type="text" value={providerSearch} onChange={e => setProviderSearch(e.target.value)}
                        placeholder="Search provider..."
                        autoFocus
                        className="w-full px-2.5 py-1.5 border-2 border-line rounded-md text-[11px] mono-brutal bg-surface placeholder:text-subtext/70 focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
                    </div>
                    <div className="overflow-y-auto">
                    <button
                      onClick={() => { setProviderFilter('all'); setProviderOpen(false) }}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors mono-brutal font-bold ${providerFilter === 'all' ? 'text-primary-text bg-[#ff3d81]/10' : 'text-subtext hover:bg-canvas hover:text-ink'}`}
                    >
                      <div className="w-5 h-5 rounded bg-muted border-2 border-line flex items-center justify-center">
                        <svg className="w-3 h-3 text-subtext" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 6h16M4 12h16M4 18h16"/></svg>
                      </div>
                      <span className="flex-1 text-left">All providers</span>
                      <span className="text-subtext/70">{stats?.total ?? files.length}</span>
                      {providerFilter === 'all' && <svg className="w-3.5 h-3.5 text-primary-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7"/></svg>}
                    </button>
                    {providerTypes
                      .filter(p => !providerSearch || p.name.toLowerCase().includes(providerSearch.toLowerCase()) || p.id.toLowerCase().includes(providerSearch.toLowerCase()))
                      .map(p => {
                      const fm = getMeta(p.id)
                      return (
                        <button
                          key={p.id}
                          onClick={() => { setProviderFilter(p.id); setProviderOpen(false) }}
                          className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors mono-brutal font-bold ${providerFilter === p.id ? 'text-primary-text bg-[#ff3d81]/10' : 'text-subtext hover:bg-canvas hover:text-ink'}`}
                        >
                          <div className="w-5 h-5 rounded shrink-0 overflow-hidden bg-muted border-2 border-line flex items-center justify-center">
                            {fm.icon_name ? (
                              <img src={iconUrl(fm.icon_name)} alt="" className="w-full h-full object-contain p-0.5" />
                            ) : (
                              <span className="mono-brutal text-[9px] text-subtext font-bold">{fm.name[0]}</span>
                            )}
                          </div>
                          <span className="flex-1 text-left truncate">{p.name}</span>
                          <span className="text-subtext/70">{p.count}</span>
                          {providerFilter === p.id && <svg className="w-3.5 h-3.5 text-primary-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7"/></svg>}
                        </button>
                      )
                    })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs mono-brutal">
            <button onClick={() => setOnlyProblem(v => !v)} className={`status-pill ${onlyProblem ? 'bg-[#ff6b5e] text-on-accent' : 'bg-surface text-subtext hover:text-ink'}`}>
              Problematic {problemCount}
            </button>
            <button onClick={() => setOnlyDisabled(v => !v)} className={`status-pill ${onlyDisabled ? 'bg-[#ffd23f] text-on-accent' : 'bg-surface text-subtext hover:text-ink'}`}>
              Disabled {disabledCount}
            </button>
            {onlyProblem && availableCodes.length > 0 && (
              <>
                <span className="w-px h-5 bg-line" />
                <button onClick={() => setStatusCodeFilter('all')}
                  className={`status-pill ${statusCodeFilter === 'all' ? 'bg-[#ff6b5e] text-on-accent' : 'bg-surface text-subtext hover:text-ink'}`}>
                  All
                </button>
                {availableCodes.map(code => (
                  <button key={code} onClick={() => setStatusCodeFilter(String(code))}
                    className={`status-pill ${statusCodeFilter === String(code) ? 'bg-[#ff6b5e] text-on-accent' : 'bg-surface text-subtext hover:text-ink'}`}>
                    {code}
                  </button>
                ))}
              </>
            )}
            <span className="w-px h-5 bg-line" />
            <button onClick={selectVisible} disabled={!visibleIds.length} className="status-pill bg-surface text-subtext hover:text-ink disabled:opacity-40">
              Select {paginated.length}
            </button>
            <button onClick={clearVisible} disabled={!selectedVisible} className="status-pill bg-surface text-subtext hover:text-ink disabled:opacity-40">
              Clear {selectedVisible}
            </button>
            <button onClick={deleteSelected} disabled={!selectedIds.size} className="status-pill bg-[#ff6b5e] text-on-accent disabled:opacity-40">
              Delete {selectedIds.size}
            </button>
            <button onClick={downloadSelected} disabled={!selectedIds.size} className="status-pill bg-[#ff3d81] text-on-accent disabled:opacity-40"
              title="Download selected as JSON array">
              ⬇ Download {selectedIds.size}
            </button>
            {onlyDisabled && (
              <button onClick={enableSelected} disabled={!selectedIds.size} className="status-pill bg-[#3ddc97] text-on-accent disabled:opacity-40" title="Enable + reset error counters (backoff, consecutive errors)">
                Enable {selectedIds.size}
              </button>
            )}
          </div>

          {/* Dedupe row — minimal, sits under the provider dropdown. */}
          <div className="relative flex items-center gap-3 rounded-lg border-2 border-line bg-canvas px-3 py-2.5 transition-colors hover:bg-muted">
            <span className="text-xs font-bold text-warning-text shrink-0">Remove Duplicate keys</span>
            <span className="text-subtext/70">·</span>
            <span className="flex-1 min-w-0 text-xs text-subtext truncate mono-brutal">
              keep oldest of{' '}
              <code className="px-1 py-px rounded bg-muted text-subtext mono-brutal text-[10.5px] border border-line">provider_id + key_value</code>
            </span>
            <span className="hidden sm:inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] mono-brutal text-subtext border-2 border-line font-bold">
              {providerFilter === 'all' ? 'all' : providerFilter}
            </span>
            <span className={`inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-md text-[11px] mono-brutal font-bold border-2 border-line ${
              (stats?.duplicates ?? 0) > 0
                ? 'bg-[#ffd23f] text-on-accent'
                : 'bg-muted text-subtext'
            }`}>
              {stats?.duplicates ?? 0}
            </span>
            <button onClick={runDedupe}
              className="brutal-btn shrink-0 inline-flex items-center gap-1 h-7 px-2.5 bg-[#ffd23f] text-on-accent text-xs font-bold">
              Run
            </button>
          </div>
        </div>

        {/* CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {!paginated.length && !loading && (
            <div className="col-span-full text-center py-20 text-subtext text-sm mono-brutal">
              <span className="text-primary-text">◈</span> No auth files match your filter.
            </div>
          )}
          {paginated.map(f => {
            const meta = getMeta(f.provider_id)
            const sel = selectedIds.has(f.id)
            const exp = parseExpiry(f.expires_at)
            const secrets = getSecrets(f)
            const isOAuth = f.key_type?.toLowerCase() === 'oauth'
            const hasUsageError = !!f.last_error_message || !!f.last_error_status
            const accentColor = meta.color || '#6366F1'

            return (
              <div key={f.id}
                className={`brutal-card transition-all duration-150 overflow-hidden ${sel ? 'ring-2 ring-[#ff3d81]' : ''}`}
              >
                {/* HEAD */}
                <div className="p-3 flex items-start gap-3">
                  <label className="mt-1 shrink-0 cursor-pointer">
                    <input type="checkbox" checked={sel} onChange={() => toggle(f.id)}
                      className="w-3.5 h-3.5 rounded border-2 border-line bg-surface"
                      style={{ accentColor: '#ff3d81' }} />
                  </label>
                  <div className="w-9 h-9 rounded-lg shrink-0 overflow-hidden bg-muted border-2 border-line flex items-center justify-center">
                    {meta.icon_name ? (
                      <img src={iconUrl(meta.icon_name)} alt="" className="w-full h-full object-contain p-1" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; const el = (e.target as HTMLImageElement).nextElementSibling as HTMLElement; if (el) el.style.display = 'flex' }} />
                    ) : null}
                    <div className={`w-full h-full items-center justify-center ${meta.icon_name ? 'hidden' : 'flex'}`}>
                      <span className="mono-brutal text-sm font-bold" style={{ color: accentColor }}>{meta.name[0]}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold truncate max-w-[120px] text-ink">{meta.name}</span>
                      <span className={`status-pill text-[9px] ${
                        isOAuth ? 'bg-[#c8a2ff] text-on-accent' : 'bg-muted text-subtext'
                      }`}>{isOAuth ? 'OAUTH' : 'API'}</span>
                      {hasUsageError ? (
                        <span className="status-pill bg-[#ff6b5e] text-on-accent text-[9px]">error</span>
                      ) : (
                        <span className={`status-pill text-[9px] ${f.is_active ? 'bg-[#3ddc97] text-on-accent' : 'bg-[#ff6b5e] text-on-accent'}`}>
                          {f.is_active ? 'active' : 'disabled'}
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-subtext font-bold truncate mt-0.5" title={f.label}>{f.label || '—'}</div>
                  </div>
                </div>

                {/* STATUS & TOGGLE BAR — active/inactive switch with error counter */}
                <div className="mx-3 mb-2 px-2.5 py-2 rounded-lg border-2 border-line bg-canvas flex items-center justify-between gap-2">
                  {/* Left: state icon + label + error counter */}
                  <div className="flex items-center gap-2 min-w-0">
                    {f.is_active ? (
                      <svg className="w-3.5 h-3.5 shrink-0 text-success-text" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 shrink-0 text-danger-text" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className={`text-[10px] mono-brutal font-bold ${f.is_active ? 'text-success-text' : 'text-danger-text'}`}>
                      {f.is_active ? 'ACTIVE' : 'DISABLED'}
                    </span>
                    {(f.consecutive_error_count ?? 0) > 0 && (
                      <span
                        className={`status-pill text-[9px] ${
                          (f.consecutive_error_count ?? 0) >= 3
                            ? 'bg-[#ff6b5e] text-on-accent'
                            : 'bg-[#ffd23f] text-on-accent'
                        }`}
                        title={`${f.consecutive_error_count} consecutive errors — auto-deactivates at 3`}
                      >
                        {f.consecutive_error_count}/3
                      </span>
                    )}
                  </div>
                  {/* Right: real toggle switch */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      const newState = !f.is_active
                      if (!confirm(`${newState ? 'Enable' : 'Disable'} ${f.label || f.id}?`)) return
                      try {
                        await toggleAuthFile(f.id, newState)
                        await reload()
                        setImportMsg({ ok: true, text: `Key ${newState ? 'enabled' : 'disabled'}` })
                      } catch (err: any) {
                        setImportMsg({ ok: false, text: `Toggle failed: ${err.message}` })
                      }
                    }}
                    className={`relative shrink-0 rounded-full border-2 border-line transition-colors ${f.is_active ? 'bg-[#3ddc97]' : 'bg-[#ff6b5e]'}`}
                    style={{ width: '34px', height: '18px' }}
                    title={f.is_active ? 'Click to disable' : 'Click to enable'}
                  >
                    <span
                      className="absolute top-0 rounded-full bg-surface border-2 border-line transition-all"
                      style={{
                        width: '14px',
                        height: '14px',
                        left: f.is_active ? '17px' : '2px',
                      }}
                    />
                  </button>
                </div>

                {/* OAUTH DETAILS */}
                {isOAuth && (
                  <div className="mx-3 mb-2 rounded-lg border-2 border-line bg-muted p-2.5 space-y-1.5 text-[11px] mono-brutal">
                    <div className="flex items-center justify-between">
                      <span className="text-subtext font-bold">Token expiry</span>
                      <span className={`mono-brutal font-bold ${exp.expired ? 'text-danger-text' : exp.infinite ? 'text-primary-text' : 'text-ink'}`}>
                        {exp.expired ? 'Expired' : exp.infinite ? '∞' : exp.label}
                      </span>
                    </div>
                    {f.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-subtext font-bold">Email</span>
                        <span className="text-ink truncate max-w-[180px] font-bold" title={f.email}>{f.email}</span>
                      </div>
                    )}
                    {f.plan && (
                      <div className="flex items-center justify-between">
                        <span className="text-subtext font-bold">Plan</span>
                        <span className="status-pill bg-[#3ddc97] text-on-accent text-[9px]">{f.plan}</span>
                      </div>
                    )}
                    {exp.seconds > 0 && !exp.expired && !exp.infinite && (
                      <div className="flex items-center justify-between">
                        <span className="text-subtext font-bold">Expires</span>
                        <span className="text-ink font-bold">{fmtDate(f.expires_at)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* LAST ERROR */}
                {hasUsageError && (
                  <div className="mx-3 mb-2 rounded-lg border-2 border-[#ff6b5e] bg-[#ff6b5e]/10 p-2.5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] mono-brutal font-bold text-danger-text uppercase tracking-wider">Last error</span>
                      <span className="text-[9px] mono-brutal text-danger-text font-bold">
                        {f.last_error_status ? `[${f.last_error_status}]` : 'ERR'}
                      </span>
                    </div>
                    {f.last_error_message && (
                      <div className="text-[10px] mono-brutal text-danger-text break-words leading-relaxed">
                        {f.last_error_message}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 text-[9px] mono-brutal text-subtext/70">
                      <span className="truncate" title={f.last_error_model || ''}>{f.last_error_model || '—'}</span>
                      <span className="shrink-0">{f.last_error_at ? fmtDate(f.last_error_at) : ''}</span>
                    </div>
                  </div>
                )}

                {/* SECRETS */}
                <div className="mx-3 mb-2 space-y-1">
                  {secrets.map(s => (
                    <div key={s.field} className="flex items-center justify-between rounded-lg bg-muted border-2 border-line px-2.5 py-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="text-[9px] mono-brutal text-subtext font-bold">{s.field}</div>
                        <div className="text-[10px] mono-brutal text-subtext truncate">{s.preview}</div>
                      </div>
                      <button onClick={() => copySecret(`${f.id}:${s.field}`, s.value)}
                        className="shrink-0 ml-2 text-subtext/70 hover:text-primary-text transition-colors p-1 font-bold">
                        {copiedKey === `${f.id}:${s.field}` ? '✓' : copiedKey === `${f.id}:${s.field}:err` ? '✗' : '⧉'}
                      </button>
                    </div>
                  ))}
                  {!secrets.length && (
                    <div className="text-[10px] text-subtext text-center py-2 mono-brutal">No secret fields</div>
                  )}
                </div>

                {/* ACTIONS */}
                <div className="mx-3 mb-3 grid grid-cols-2 gap-1.5">
                  {isOAuth && f.has_refresh && (f.provider_id === 'gb' || f.provider_id === 'cx') && <button onClick={async () => { try { const r = await refreshAuthFile(f.id, f.provider_id); if (!r.ok) throw new Error(r.error || 'Refresh failed'); setImportMsg({ ok: true, text: 'Token refreshed' }); await reload() } catch (e: any) { setImportMsg({ ok: false, text: e.message }) } }} className="brutal-btn col-span-2 text-[10px] py-1.5 bg-[#c8a2ff] text-on-accent font-bold">Refresh token</button>}
                  <button onClick={() => downloadJson(f)}
                    className="brutal-btn text-[10px] py-1.5 bg-surface text-ink font-bold">
                    Download
                  </button>
                  <button onClick={async () => {
                    if (!confirm(`Delete ${f.label || f.id}?`)) return
                    try {
                      await apiFetch('/keys/delete', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ key_id: f.id }),
                      })
                      setImportMsg({ ok: true, text: 'Deleted' })
                      await reload()
                    } catch { setImportMsg({ ok: false, text: 'Delete failed' }) }
                  }}
                    className="brutal-btn text-[10px] py-1.5 bg-[#ff6b5e] text-on-accent font-bold">
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="brutal-btn h-8 px-2.5 flex items-center justify-center bg-surface text-ink text-xs font-bold disabled:opacity-30 disabled:pointer-events-none">
              ← Prev
            </button>
            {(() => {
              const pages: (number | '...')[] = []
              const cur = page
              if (totalPages <= 7) {
                for (let i = 0; i < totalPages; i++) pages.push(i)
              } else {
                pages.push(0)
                if (cur > 2) pages.push('...')
                for (let i = Math.max(1, cur - 1); i <= Math.min(totalPages - 2, cur + 1); i++) pages.push(i)
                if (cur < totalPages - 3) pages.push('...')
                pages.push(totalPages - 1)
              }
              return pages.map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="text-subtext/70 text-xs px-1 mono-brutal">…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p)}
                    className={`brutal-btn h-8 min-w-[2rem] flex items-center justify-center text-xs font-bold ${
                      p === page
                        ? 'bg-[#ff3d81] text-on-accent'
                        : 'bg-surface text-ink'
                    }`}>
                    {p + 1}
                  </button>
                )
              )
            })()}
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="brutal-btn h-8 px-2.5 flex items-center justify-center bg-surface text-ink text-xs font-bold disabled:opacity-30 disabled:pointer-events-none">
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

