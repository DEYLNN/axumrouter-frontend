import { useState } from 'react'

interface AuthFile {
  id: string; provider_id: string; label: string; key_type: string
  key_value: string; key_preview: string; email: string; plan: string
  account_id: string; has_refresh: boolean; has_access: boolean
  expires_at: string; is_active: boolean; created_at: string
}

interface ProviderInfo {
  name: string; display_name: string; icon_url: string; color: string
}

interface Secret { field: string; preview: string; value: string }

function fmtDate(v?: string) { return v ? new Date(v).toLocaleString() : '-' }

function parseExpiry(e: string) {
  if (!e || e === 'expired') return { label: 'Expired', expired: true, seconds: 0 }
  const t = Date.parse(e.replace('Z', '+00:00'))
  if (isNaN(t)) return { label: e, expired: false, seconds: 0 }
  const s = Math.max(0, Math.floor((t - Date.now()) / 1000))
  if (s <= 0) return { label: 'Expired', expired: true, seconds: 0 }
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  return { label: d > 0 ? `${d}d ${h}h` : `${h}h`, expired: false, seconds: s }
}

function getSecrets(f: AuthFile): Secret[] {
  const secs: Secret[] = []
  let parsed: any = null
  try { parsed = JSON.parse(f.key_value) } catch { parsed = null }
  if (f.key_type?.toLowerCase() === 'oauth') {
    if (f.has_access) secs.push({ field: 'access_token', preview: '••••••••', value: parsed?.access_token || '[stored in db]' })
    if (f.has_refresh) secs.push({ field: 'refresh_token', preview: '••••••••', value: parsed?.refresh_token || '[stored in db]' })
  } else {
    const rawKey = parsed?.apiKey || parsed?.apiToken || parsed?.key || f.key_value
    secs.push({ field: 'api_key', preview: f.key_preview, value: rawKey })
  }
  return secs
}

interface Props {
  file: AuthFile
  meta: ProviderInfo
  accentColor: string
  selected: boolean
  onlyDisabled: boolean
  onToggle: (id: string) => void
  onDownload: (f: AuthFile) => void
  onDelete: (f: AuthFile) => Promise<void>
}

export default function AuthFileCard({ file: f, meta, accentColor, selected: sel, onlyDisabled, onToggle, onDownload, onDelete }: Props) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const exp = parseExpiry(f.expires_at)
  const secrets = getSecrets(f)
  const isOAuth = f.key_type?.toLowerCase() === 'oauth'
  const problem = isOAuth && (!f.has_access || !f.is_active) ? (!f.has_access ? 'no_access' : 'disabled') : null

  const copySecret = async (key: string, val: string) => {
    try {
      await navigator.clipboard.writeText(val)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(c => c === key ? null : c), 1500)
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = val; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select()
        document.execCommand('copy'); document.body.removeChild(ta)
        setCopiedKey(key)
        setTimeout(() => setCopiedKey(c => c === key ? null : c), 1500)
      } catch {
        setCopiedKey(`${key}:err`)
        setTimeout(() => setCopiedKey(c => c === `${key}:err` ? null : c), 1800)
      }
    }
  }

  return (
    <div className={`rounded-xl border transition-all duration-150 overflow-hidden ${
      sel ? 'bg-gradient-to-b from-cyan-500/[0.04] to-transparent' : 'bg-[#0a0f1e]/60 hover:bg-[#0a0f1e]/80'
    }`}
    style={{
      borderColor: sel ? `${accentColor}60` : 'rgba(255,255,255,0.05)',
      boxShadow: sel
        ? `inset 0 0 20px ${accentColor}08, 0 0 15px ${accentColor}15, 0 0 40px ${accentColor}05`
        : 'inset 0 1px 0 rgba(255,255,255,0.03)',
    }}>
      {/* HEAD */}
      <div className="p-3 flex items-start gap-3">
        <label className="mt-1 shrink-0 cursor-pointer">
          <input type="checkbox" checked={sel} onChange={() => onToggle(f.id)}
            className="w-3.5 h-3.5 rounded border-white/20 bg-black/40"
            style={{ accentColor }} />
        </label>
        <div className="w-9 h-9 rounded-lg shrink-0 overflow-hidden bg-black/50 border flex items-center justify-center"
          style={{ borderColor: `${accentColor}40`, boxShadow: `0 0 8px ${accentColor}15` }}>
          {meta.icon_url ? (
            <img src={meta.icon_url} alt="" className="w-full h-full object-contain p-1"
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none'
                const el = (e.target as HTMLImageElement).nextElementSibling as HTMLElement
                if (el) el.style.display = 'flex'
              }} />
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
          <button onClick={() => onDownload(f)}
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
              {copiedKey === `${f.id}:${s.field}` ? '✓' : copiedKey === `${f.id}:${s.field}:err` ? '✗' : '📋'}
            </button>
          </div>
        ))}
        {!secrets.length && (
          <div className="text-[10px] text-zinc-600 text-center py-2 font-mono">No secret fields</div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="mx-3 mb-3 grid grid-cols-2 gap-1.5">
        <button onClick={() => onDownload(f)}
          className="text-[10px] py-1.5 rounded-lg border border-white/[0.06] text-zinc-400 hover:text-cyan-300 hover:border-cyan-500/30 transition-all font-mono"
          style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
          Download
        </button>
        <button onClick={() => onDelete(f)}
          className="text-[10px] py-1.5 rounded-lg border border-red-500/20 text-red-400/70 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/40 transition-all font-mono">
          Delete
        </button>
      </div>
    </div>
  )
}
