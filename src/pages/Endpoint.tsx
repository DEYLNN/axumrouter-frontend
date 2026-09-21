import { useEffect, useState } from 'react'
import { getSettings, getGatewayKeys, createGatewayKey, deleteGatewayKey, toggleSetting } from '../api'
import type { SettingsData, GatewayKey } from '../api'
import { copyToClipboard } from '../utils/clipboard'

const cavemanLevels = [
  { key: 'off', label: 'OFF' },
  { key: 'lite', label: 'LITE' },
  { key: 'full', label: 'FULL' },
  { key: 'ultra', label: 'ULTRA' },
]

const ponytailLevels = [
  { key: 'off', label: 'OFF' },
  { key: 'lite', label: 'LITE' },
  { key: 'full', label: 'FULL' },
  { key: 'ultra', label: 'ULTRA' },
]

const envGatewayUrl = import.meta.env.VITE_GATEWAY_BACKEND_URL

/* ─── Color system per section ─── */
const SECTION_COLORS = {
  openai:    { bg: '#3ddc97', label: 'OPENAI_URL' },
  anthropic: { bg: '#ff6b5e', label: 'ANTHROPIC_URL' },
  tokensaver:{ bg: '#c8a2ff', label: 'TOKEN_SAVER' },
  gateway:   { bg: '#ff3d81', label: 'GATEWAY_KEYS' },
  injection: { bg: '#ffd23f', label: 'KEY_INJECTION' },
} as const

/* ─── Reusable Neubrutal section card ─── */
function SectionCard({
  color,
  title,
  badge,
  children,
}: {
  color: string
  title: string
  badge?: string
  children: React.ReactNode
}) {
  return (
    <div className="brutal-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b-2 border-[#111111] flex items-center justify-between">
        <h2 className="heading-brutal text-sm uppercase tracking-tight">{title}</h2>
        {badge && (
          <span className="status-pill text-[10px] font-bold" style={{ backgroundColor: color }}>
            {badge}
          </span>
        )}
      </div>
      {/* Content */}
      <div className="p-6">{children}</div>
    </div>
  )
}

/* ─── Neubrutal toggle group ─── */
function ToggleGroup({
  options,
  active,
  onChange,
  accentColor,
}: {
  options: { key: string; label: string }[]
  active: string
  onChange: (key: string) => void
  accentColor: string
}) {
  return (
    <div className="flex border-2 border-[#111111] rounded-lg overflow-hidden">
      {options.map((opt, i) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`flex-1 py-2 text-xs font-bold tracking-wide transition-all ${
            i > 0 ? 'border-l-2 border-[#111111]' : ''
          } ${
            active === opt.key
              ? 'text-[#111111]'
              : 'bg-white text-gray-400 hover:text-[#111111]'
          }`}
          style={active === opt.key ? { backgroundColor: accentColor } : {}}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/* ─── Feature row inside a section ─── */
function FeatureRow({
  icon,
  name,
  desc,
  status,
  statusColor,
  children,
}: {
  icon: React.ReactNode
  name: string
  desc: string
  status: string
  statusColor: string
  children?: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center border-2 border-[#111111] shrink-0"
          style={{ backgroundColor: statusColor }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-[#111111]">{name}</span>
            <span
              className="status-pill text-[9px] font-bold"
              style={{ backgroundColor: statusColor }}
            >
              {status}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

/* ─── Neubrutal code block ─── */
function CodeBlock({ children, color = '#111111' }: { children: React.ReactNode; color?: string }) {
  return (
    <code
      className="block text-xs mono-brutal bg-white rounded-lg px-4 py-3 border-2 border-[#111111] whitespace-pre-wrap break-all"
      style={{ color }}
    >
      {children}
    </code>
  )
}

export default function Endpoint() {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [keys, setKeys] = useState<GatewayKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [newKeyLabel, setNewKeyLabel] = useState('')
  const [newKeyResult, setNewKeyResult] = useState<{ key_value: string; id: string } | null>(null)
  const [copiedId, setCopiedId] = useState('')
  const [deleting, setDeleting] = useState('')

  const loadSettings = () =>
    Promise.all([getSettings(), getGatewayKeys()])
      .then(([s, k]) => { setSettings(s); setKeys(k) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))

  useEffect(() => { loadSettings() }, [])

  const handleToggle = async (key: string, value: string) => {
    try {
      await toggleSetting(key, value)
      const s = await getSettings()
      setSettings(s)
    } catch (e: any) {
      setError(e.message)
    }
  }

  const gatewayUrl = envGatewayUrl
    ? `${envGatewayUrl.replace(/\/+$/, '')}/v1`
    : settings?.public_url
      ? `${settings.public_url.replace(/\/+$/, '')}/v1`
      : ''

  const claudeUrl = envGatewayUrl
    ? envGatewayUrl.replace(/\/+$/, '')
    : settings?.public_url
      ? settings.public_url.replace(/\/+$/, '')
      : ''

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await createGatewayKey(newKeyLabel || 'default')
      if (res.key_value && res.id) {
        setNewKeyResult({ key_value: res.key_value, id: res.id })
        setKeys(prev => [...prev, {
          id: res.id!, key_value: res.key_value!, label: newKeyLabel || null,
          is_active: 1, created_at: new Date().toISOString(),
        }])
        setNewKeyLabel('')
      }
    } catch (e: any) {
      setError(e.message)
    }
    setCreating(false)
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await deleteGatewayKey(id)
      setKeys(prev => prev.filter(k => k.id !== id))
      if (newKeyResult?.id === id) setNewKeyResult(null)
    } catch (e: any) {
      setError(e.message)
    }
    setDeleting('')
  }

  const copy = async (val: string, id: string) => {
    const ok = await copyToClipboard(val)
    setCopiedId(ok ? id : 'fail')
    setTimeout(() => setCopiedId(''), 1500)
  }

  const maskKey = (k: string) => {
    if (k.length <= 8) return k
    return k.slice(0, 4) + '•'.repeat(12) + k.slice(-4)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-sm mono-brutal text-gray-500 animate-pulse">LOADING...</div>
    </div>
  )

  if (error) return (
    <div className="brutal-card p-6 text-center">
      <div className="text-[#ff6b5e] mono-brutal text-sm font-bold">ERROR: {error}</div>
    </div>
  )

  return (
    <div className="relative">
      <div className="space-y-6">
        {/* Page header */}
        <div className="mb-2">
          <h1 className="heading-brutal text-3xl uppercase tracking-tight">ENDPOINT</h1>
          <p className="text-lg font-medium text-gray-600">Gateway configuration &amp; access</p>
        </div>

        {/* ─── OPENAI URL ─── */}
        <SectionCard color={SECTION_COLORS.openai.bg} title="OPENAI_URL" badge="/v1/chat/completions">
          {gatewayUrl ? (
            <div className="flex items-center gap-3">
              <CodeBlock>{gatewayUrl}</CodeBlock>
              <button
                onClick={() => copy(gatewayUrl, '__url__')}
                className={`brutal-btn shrink-0 px-4 py-2 text-xs font-bold ${
                  copiedId === '__url__'
                    ? 'bg-[#3ddc97] text-[#111111]'
                    : 'bg-white text-[#111111]'
                }`}
              >
                {copiedId === '__url__' ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          ) : (
            <p className="text-xs mono-brutal text-gray-500">Set VITE_GATEWAY_BACKEND_URL in .env or wait for settings...</p>
          )}
        </SectionCard>

        {/* ─── ANTHROPIC URL ─── */}
        <div className="opacity-50">
          <SectionCard color={SECTION_COLORS.anthropic.bg} title="ANTHROPIC_URL" badge="COMING SOON">
            <div className="flex items-center gap-3">
              <CodeBlock color="#999">{claudeUrl || 'http://ip:port'}</CodeBlock>
              <button disabled className="brutal-btn shrink-0 px-4 py-2 text-xs font-bold text-gray-400 bg-gray-100 border-gray-300 cursor-not-allowed">
                Not Available
              </button>
            </div>
          </SectionCard>
        </div>

        {/* ─── TOKEN SAVER ─── */}
        {settings && (
          <SectionCard color={SECTION_COLORS.tokensaver.bg} title="TOKEN_SAVER" badge="Optimize token usage">
            <div className="space-y-5">
              {/* RTK */}
              <FeatureRow
                name="RTK"
                desc="Compress tool output — fewer input tokens"
                status={settings.rtk_enabled === 'true' ? 'ON' : 'OFF'}
                statusColor={settings.rtk_enabled === 'true' ? '#3ddc97' : '#e5e5e5'}
                icon={
                  <svg className="w-5 h-5 text-[#111111]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M8 5V3h8v2" />
                  </svg>
                }
              >
                <ToggleGroup
                  options={[{ key: 'false', label: 'OFF' }, { key: 'true', label: 'ON' }]}
                  active={settings.rtk_enabled}
                  onChange={v => handleToggle('rtk_enabled', v)}
                  accentColor="#3ddc97"
                />
              </FeatureRow>

              {/* Headroom */}
              <FeatureRow
                name="Headroom"
                desc="Compress prompts before routing"
                status="SOON"
                statusColor="#e5e5e5"
                icon={
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                }
              />

              {/* Caveman */}
              <FeatureRow
                name="Caveman"
                desc="Terse LLM output ~65% fewer tokens"
                status={settings.caveman_enabled === 'off' ? 'OFF' : settings.caveman_enabled.toUpperCase()}
                statusColor={settings.caveman_enabled !== 'off' ? '#c8a2ff' : '#e5e5e5'}
                icon={
                  <svg className="w-5 h-5 text-[#111111]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              >
                <ToggleGroup
                  options={cavemanLevels}
                  active={settings.caveman_enabled}
                  onChange={v => handleToggle('caveman_enabled', v)}
                  accentColor="#c8a2ff"
                />
              </FeatureRow>

              {/* Ponytail */}
              <FeatureRow
                name="Ponytail"
                desc="Lazy senior dev — minimal output"
                status={settings.ponytail_enabled === 'off' ? 'OFF' : settings.ponytail_enabled.toUpperCase()}
                statusColor={settings.ponytail_enabled !== 'off' ? '#ffd23f' : '#e5e5e5'}
                icon={
                  <svg className="w-5 h-5 text-[#111111]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                }
              >
                <ToggleGroup
                  options={ponytailLevels}
                  active={settings.ponytail_enabled}
                  onChange={v => handleToggle('ponytail_enabled', v)}
                  accentColor="#ffd23f"
                />
              </FeatureRow>
            </div>
          </SectionCard>
        )}

        {/* ─── GATEWAY KEYS ─── */}
        <SectionCard color={SECTION_COLORS.gateway.bg} title="GATEWAY_KEYS" badge={`${keys.length} key${keys.length !== 1 ? 's' : ''}`}>
          {/* New key alert */}
          {newKeyResult && (
            <div className="mb-4 p-4 rounded-lg bg-[#ffd23f]/10 border-2 border-[#ffd23f]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] mono-brutal font-bold text-[#111111] tracking-wider uppercase">KEY CREATED — COPY NOW</span>
                <button onClick={() => setNewKeyResult(null)} className="text-[10px] text-gray-500 hover:text-[#111111] transition-colors font-bold">Dismiss</button>
              </div>
              <div className="flex items-center gap-2">
                <CodeBlock>{newKeyResult.key_value}</CodeBlock>
                <button onClick={() => copy(newKeyResult.key_value, 'new_key')}
                  className={`brutal-btn shrink-0 px-3 py-2 text-xs font-bold ${
                    copiedId === 'new_key' ? 'bg-[#3ddc97] text-[#111111]' : 'bg-[#ffd23f] text-[#111111]'
                  }`}>
                  {copiedId === 'new_key' ? '✓' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Key list */}
          <div className="space-y-2">
            {keys.length === 0 ? (
              <div className="text-center py-8 text-xs mono-brutal text-gray-500">No gateway keys yet. Create one below.</div>
            ) : (
              keys.map(k => (
                <div key={k.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-[#111111] group hover:-translate-y-0.5 transition-all">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 border border-[#111111] ${k.is_active ? 'bg-[#3ddc97]' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {k.label && <span className="text-xs font-bold text-[#111111]">{k.label}</span>}
                      <span className="text-[10px] mono-brutal text-gray-500">
                        {new Date(k.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    <code className="text-xs mono-brutal text-gray-500 truncate block">
                      {k.id === newKeyResult?.id ? newKeyResult.key_value : maskKey(k.key_value)}
                    </code>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => copy(k.key_value, k.id)}
                      className={`w-7 h-7 flex items-center justify-center rounded-md transition-all border-2 ${
                        copiedId === k.id ? 'text-[#3ddc97] bg-[#3ddc97]/10 border-[#3ddc97]' : 'text-gray-400 hover:text-[#3ddc97] hover:bg-[#3ddc97]/10 border-transparent hover:border-[#3ddc97]'
                      }`}
                      title="Copy key">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d={copiedId === k.id ? 'M5 13l4 4L19 7' : 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'} />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(k.id)} disabled={deleting === k.id}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-[#ff6b5e] hover:bg-[#ff6b5e]/10 transition-all disabled:opacity-30 border-2 border-transparent hover:border-[#ff6b5e]"
                      title="Delete key">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d={deleting === k.id ? 'M12 4v16m8-8H4' : 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'} />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Create form */}
          <div className="mt-4 pt-4 border-t-2 border-[#111111]">
            <div className="flex items-center gap-2">
              <input type="text" value={newKeyLabel} onChange={e => setNewKeyLabel(e.target.value)}
                placeholder="Key label (optional)"
                className="flex-1 px-4 py-2 border-2 border-[#111111] rounded-lg text-xs mono-brutal bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff3d81] transition-all"
                onKeyDown={e => e.key === 'Enter' && newKeyLabel !== '' && handleCreate()} />
              <button onClick={handleCreate} disabled={creating}
                className="brutal-btn shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#3ddc97] text-[#111111] disabled:opacity-40">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 4v16m8-8H4" />
                </svg>
                {creating ? 'Creating...' : 'New Key'}
              </button>
            </div>
          </div>
        </SectionCard>

        {/* ─── KEY INJECTION ─── */}
        <SectionCard color={SECTION_COLORS.injection.bg} title="KEY_INJECTION" badge="POST /admin/api/keys/bulk-add">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] mono-brutal text-gray-500 uppercase tracking-wider font-bold">Endpoint</span>
              <CodeBlock>{gatewayUrl ? gatewayUrl.replace(/\/v1$/, '') : 'http://IP:PORT'}/admin/api/keys/bulk-add</CodeBlock>
            </div>
            <div>
              <span className="text-[10px] mono-brutal text-gray-500 uppercase tracking-wider font-bold">curl</span>
              <CodeBlock color="#ff3d81">{`curl -X POST {base}/admin/api/keys/bulk-add \\
  -H "Authorization: Bearer ***" \\
  -H "Content-Type: application/json" \\
  -d '{"provider_id":"sop","keys":["sk-xxx","sk-yyy"]}'`}</CodeBlock>
            </div>
            <div>
              <span className="text-[10px] mono-brutal text-gray-500 uppercase tracking-wider font-bold">Response</span>
              <CodeBlock color="#3ddc97">{`{"added":2,"duplicates":0,"total":2,"message":"2 added, 0 duplicates skipped"}`}</CodeBlock>
            </div>
            <p className="text-[10px] mono-brutal text-gray-500">
              Accepts JSON array or <code>{"{keys:[...]}"}</code> object. Skips duplicates.
            </p>
            <p className="text-[10px] mono-brutal text-gray-500">
              Admin token: <code>curl -X POST {gatewayUrl ? gatewayUrl.replace(/\/v1$/, '') : '{base}'}/admin/api/login -d '&#123;"password":"PASSWORD"&#125;'</code>
            </p>
            <div className="border-t-2 border-[#111111] pt-4">
              <span className="text-[10px] mono-brutal text-gray-500 uppercase tracking-wider font-bold">Count keys</span>
              <CodeBlock color="#ff3d81">{`curl -H "Authorization: Bearer ***" \\
  {base}/admin/api/keys/count?provider_id=sop`}</CodeBlock>
              <CodeBlock color="#3ddc97">{`{"provider_id":"sop","total":5,"active":5,"disabled":0}`}</CodeBlock>
            </div>
            <div className="border-t-2 border-[#111111] pt-4">
              <span className="text-[10px] mono-brutal text-gray-500 uppercase tracking-wider font-bold">Delete keys</span>
              <CodeBlock color="#ff6b5e">{`# delete all
curl -X POST {base}/admin/api/keys/bulk-delete \\
  -H "Authorization: Bearer ***" \\
  -d '{"provider_id":"sop","action":"all"}'

# delete by key_value
curl -X POST {base}/admin/api/keys/bulk-delete \\
  -H "Authorization: Bearer ***" \\
  -d '{"provider_id":"sop","action":"by_key","key_value":"sk-xxx"}'`}</CodeBlock>
              <CodeBlock color="#3ddc97">{`{"deleted":2,"message":"Deleted 2 key(s) from sop"}`}</CodeBlock>
            </div>
            <div className="border-t-2 border-[#111111] pt-4">
              <span className="text-[10px] mono-brutal text-gray-500 uppercase tracking-wider font-bold">Docs</span>
              <CodeBlock color="#999">{gatewayUrl ? gatewayUrl.replace(/\/v1$/, '') : 'http://IP:PORT'}/admin/api/docs/key-injection</CodeBlock>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
