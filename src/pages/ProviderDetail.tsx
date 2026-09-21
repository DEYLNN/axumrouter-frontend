import Modal from '../components/Modal'
import { useEffect, useMemo, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import OAuthConnectModal from '../components/OAuthConnectModal'
import { useProviderDetail } from '../hooks/useProviderDetail'
import { iconUrl, deleteCustomProvider, addCustomModelForProvider, removeCustomModelForProvider, listCustomModels } from '../api'

const typeLabel: Record<string, string> = {
  apikey: 'API Key',
  oauth: 'OAuth',
  custom: 'Custom',
}

/* ─── Palette ─── */
const C = {
  ink: 'var(--ink)',
  primary: '#ff3d81',
  success: '#3ddc97',
  warning: '#ffd23f',
  accent: '#c8a2ff',
  danger: '#ff6b5e',
}

/* ─── Section card wrapper ─── */
function SectionCard({
  accent,
  title,
  count,
  action,
  children,
  noPadding,
}: {
  accent: string
  title: string
  count?: number | string
  action?: React.ReactNode
  children: React.ReactNode
  noPadding?: boolean
}) {
  return (
    <div className="brutal-card overflow-hidden">
      <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b-2 border-line flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="w-2.5 h-2.5 border-2 border-line shrink-0"
            style={{ backgroundColor: accent }}
          />
          <h2 className="heading-brutal text-sm uppercase tracking-tight">{title}</h2>
          {count !== undefined && (
            <span className="text-[10px] mono-brutal px-2 py-0.5 rounded-full border-2 border-line font-bold"
              style={{ backgroundColor: `${accent}30` }}>
              {count}
            </span>
          )}
        </div>
        {action}
      </div>
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </div>
  )
}

/* ─── Icon action button ─── */
function IconBtn({
  onClick,
  color,
  title,
  active,
  disabled,
  children,
}: {
  onClick: () => void
  color: string
  title: string
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg border-2 transition-all disabled:opacity-40 ${
        active
          ? 'text-ink'
          : 'text-subtext/70 bg-surface border-transparent hover:border-line'
      }`}
      style={active ? { backgroundColor: color, borderColor: C.ink } : {}}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.backgroundColor = `${color}25`
          e.currentTarget.style.color = C.ink
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.backgroundColor = ''
          e.currentTarget.style.color = ''
        }
      }}
    >
      {children}
    </button>
  )
}

/* ─── Stat card ─── */
function StatCard({
  label,
  value,
  color,
  icon,
  emphasis,
}: {
  label: string
  value: number
  color: string
  icon: React.ReactNode
  emphasis?: boolean
}) {
  return (
    <div className="brutal-card p-3 sm:p-4 hover:-translate-y-1 transition-all">
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center border-2 border-line shrink-0"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
      </div>
      <div
        className="heading-brutal text-2xl sm:text-3xl leading-none"
        style={{ color: emphasis ? color : C.ink }}
      >
        {value}
      </div>
      <div className="text-[9px] sm:text-[10px] mono-brutal text-subtext mt-1.5 sm:mt-2 uppercase tracking-wider font-bold">
        {label}
      </div>
    </div>
  )
}

export default function ProviderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const ctx = useProviderDetail(id)
  const [showAddModel, setShowAddModel] = useState(false)
  const [newModel, setNewModel] = useState({ model_id: '', ctx: 256000 })
  const [customModels, setCustomModels] = useState<string[]>([])
  const [cmKey, setCmKey] = useState(0)
  const [modelError, setModelError] = useState('')

  useEffect(() => { ctx.load() }, [ctx.load])

  // Load custom models whenever provider id changes or cmKey bumps
  useEffect(() => {
    if (!id) return
    listCustomModels(id).then(rows => setCustomModels(rows.map(r => r.model_id))).catch(() => {})
  }, [id, cmKey])

  const isCustom = id?.startsWith('custom_')

  const providerInfo = useMemo(() => ctx.data ? {
    id: ctx.data.id, name: ctx.data.name, display_name: ctx.data.display_name,
    icon_name: ctx.data.icon_name, color: ctx.data.color, oauth_flow: ctx.data.oauth_flow
  } : null, [ctx.data])

  // Live cooldown ticker — decrements locked_remaining every second
  const [tick, setTick] = useState(0)
  const tickRef = useRef<ReturnType<typeof setInterval>>(undefined)
  useEffect(() => {
    tickRef.current = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(tickRef.current)
  }, [])

  if (ctx.loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-sm mono-brutal text-subtext animate-pulse">LOADING...</div>
    </div>
  )

  if (ctx.error) return (
    <div className="brutal-card p-6 text-center">
      <div className="text-[#ff6b5e] mono-brutal text-sm font-bold">ERROR: {ctx.error}</div>
    </div>
  )

  if (!ctx.data) return null

  const { data, testResult } = ctx
  const label = typeLabel[data.type] || data.type
  const accent = data.color || C.primary

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ─── HERO HEADER ─── */}
      <div>
        <Link to="/admin/providers" className="inline-flex items-center gap-1.5 text-xs mono-brutal text-subtext hover:text-ink transition-colors mb-4 font-bold">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5m7-7l-7 7 7 7" />
          </svg>
          Back to providers
        </Link>
        {/* Hero header — responsive */}
          <div className="brutal-card overflow-hidden">
            {/* accent stripe */}
            <div className="h-1.5 border-b-2 border-line" style={{ backgroundColor: accent }} />
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 relative">
              {/* icon */}
              <div
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center border-2 border-line shrink-0 shadow-[2px_2px_0px_0px_var(--shadow)] sm:shadow-[3px_3px_0px_0px_var(--shadow)] lg:shadow-[4px_4px_0px_0px_var(--shadow)]"
                style={{ backgroundColor: `${accent}20` }}
              >
                {data.icon_name ? (
                  <img src={iconUrl(data.icon_name)} alt="" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
                ) : (
                  <span className="heading-brutal text-xl sm:text-2xl" style={{ color: accent }}>
                    {data.display_name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <h1 className="heading-brutal text-xl sm:text-2xl uppercase tracking-tight">{data.display_name}</h1>
                  <span
                    className="text-[10px] mono-brutal px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border-2 border-line font-bold"
                    style={{ backgroundColor: `${accent}25` }}
                  >
                    {data.id}
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-2.5 mt-2 flex-wrap">
                  <span
                    className="text-[9px] sm:text-[10px] mono-brutal px-2 sm:px-2.5 py-0.5 rounded-full border-2 border-line font-bold"
                    style={{ backgroundColor: C.warning }}
                  >
                    {label.toUpperCase()}
                  </span>
                  <span className="text-[10px] mono-brutal text-subtext">
                    <b className="text-ink">{data.models?.length || 0}</b> models
                  </span>
                  <span className="text-subtext/70">·</span>
                  <span className="text-[10px] mono-brutal text-subtext">
                    <b className="text-ink">{data.capabilities?.length || 0}</b> capabilities
                  </span>
                </div>
                {data.base_url && (
                  <div className="mt-2">
                    <span className="text-[9px] sm:text-[10px] mono-brutal text-subtext truncate max-w-full sm:max-w-[320px] inline-block bg-muted px-2 py-0.5 rounded border-2 border-line" title={data.base_url}>
                      {data.base_url}
                    </span>
                  </div>
                )}
              </div>

              {isCustom && (
                <button onClick={async () => {
                  if (!confirm('Delete this custom provider?')) return
                  if (!id) return
                  await deleteCustomProvider(id)
                  navigate('/admin/providers')
                }}
                  className="self-end sm:self-start w-9 h-9 flex items-center justify-center rounded-lg bg-surface border-2 border-[#ff6b5e] text-[#ff6b5e] hover:bg-[#ff6b5e] hover:text-white transition-colors shrink-0"
                  title="Delete provider">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
      </div>

      {/* ─── STATS ─── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCard
          label="Active"
          value={data.active_keys}
          color={C.success}
          icon={
            <svg className="w-5 h-5 text-ink" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Total"
          value={data.total_keys}
          color={C.accent}
          icon={
            <svg className="w-5 h-5 text-ink" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          }
        />
        <StatCard
          label="Locked"
          value={data.locked_keys}
          color={data.locked_keys > 0 ? C.danger : 'var(--muted)'}
          emphasis={data.locked_keys > 0}
          icon={
            <svg className="w-5 h-5 text-ink" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
        />
      </div>

      {/* ─── CAPABILITIES ─── */}
      {data.capabilities && data.capabilities.length > 0 && (
        <SectionCard accent={C.accent} title="Capabilities" count={data.capabilities.length}>
          <div className="flex flex-wrap gap-2">
            {data.capabilities.map(c => (
              <span key={c}
                className="text-[10px] mono-brutal px-3 py-1.5 rounded-full border-2 border-line font-bold hover:-translate-y-0.5 transition-all"
                style={{ backgroundColor: 'var(--muted)' }}>
                {c}
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ─── MODELS ─── */}
      <SectionCard
        accent={C.success}
        title="Models"
        count={data.models.length}
        noPadding
        action={
          <button onClick={() => setShowAddModel(true)}
            className="brutal-btn bg-[#3ddc97] text-on-accent px-3 py-1 text-[11px] font-bold">
            + Add Model
          </button>
        }
      >
        <div className="max-h-80 overflow-y-auto">
          <div className="divide-y-2 divide-line">
            {data.models.map(m => (
              <div key={m.id} className="px-4 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between hover:bg-canvas transition-colors group">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 border-2 border-line ${m.available && !m.blocked ? 'bg-[#3ddc97]' : 'bg-muted'}`} />
                  <div className="min-w-0">
                    <div className="text-[11px] sm:text-xs font-bold text-ink truncate">{m.name}</div>
                    <div className="text-[9px] mono-brutal text-subtext truncate mt-0.5">{m.id}</div>
                  </div>
                  {m.context_length && (
                    <span className="hidden sm:inline-block text-[9px] mono-brutal text-subtext bg-muted px-2 py-0.5 rounded-full border-2 border-line shrink-0 ml-2 font-bold">
                      {m.context_length.toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 ml-2 sm:ml-3">
                  {data.keys.length > 0 && (
                    <IconBtn onClick={() => ctx.handleTest(m.id)} color={C.accent} title="Test model" disabled={ctx.testing === m.id} active={ctx.testing === m.id}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </IconBtn>
                  )}
                  <IconBtn onClick={() => ctx.copy(m.id)} color={C.success} title="Copy model ID" active={ctx.copiedId === m.id}>
                    {ctx.copiedId === m.id ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                    )}
                  </IconBtn>
                  <IconBtn onClick={() => ctx.handleToggle(m.id, m.blocked)} color={m.blocked ? C.danger : C.warning} title={m.blocked ? 'Unblock' : 'Block'} active={ctx.toggling === m.id || m.blocked} disabled={ctx.toggling === m.id}>
                    {ctx.toggling === m.id ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="8" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        {m.blocked ? <path d="M8 11V7a4 4 0 018 0v2M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                          : <path d="M16 11V7a4 4 0 00-8 0v1m-2 3h12v10H6V11zm6 4v2" />}
                      </svg>
                    )}
                  </IconBtn>
                  {customModels.includes(m.id.split('/').slice(1).join('/') || m.id) && (
                    <IconBtn color={C.danger} title="Delete model" onClick={async () => {
                      if (!confirm(`Delete model "${m.id}"?`)) return
                      if (!id) return
                      const rawId = m.id.split('/').slice(1).join('/') || m.id
                      await removeCustomModelForProvider(id, rawId)
                      setCmKey(k => k + 1)
                    }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </IconBtn>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* ─── KEYS ─── */}
      <SectionCard
        accent={C.primary}
        title="Keys"
        count={data.keys.length}
        noPadding
        action={data.type === 'oauth' ? (
          <button onClick={() => ctx.setShowOAuth(true)}
            className="brutal-btn bg-[#ff3d81] text-white px-3 py-1 text-[11px] font-bold">
            Connect OAuth
          </button>
        ) : undefined}
      >
        {data.keys.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs mono-brutal text-subtext">No keys configured</div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <div className="divide-y-2 divide-line">
              {data.keys.map(k => (
                <div key={k.id} className="px-4 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between group hover:bg-canvas transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 border-2 border-line ${k.is_locked ? 'bg-[#ff6b5e]' : 'bg-[#3ddc97]'}`}
                        title={k.is_locked ? `Locked${k.locked_reason ? ': ' + k.locked_reason : ''}` : 'Active'} />
                      <span className="text-xs mono-brutal font-bold text-ink truncate">{k.label || k.id}</span>
                      {k.is_locked && Math.max(0, k.locked_remaining - tick) > 0 && (
                        <span className="inline-flex items-center gap-1 text-[9px] mono-brutal px-2 py-0.5 rounded-full bg-[#ff6b5e]/10 text-[#ff6b5e] border-2 border-[#ff6b5e] font-bold animate-pulse"
                          title={k.locked_reason || ''}>
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0110 0v4" />
                          </svg>
                          {(() => {
                            const s = Math.max(0, k.locked_remaining - tick)
                            const m = Math.floor(s / 60)
                            return `${m}:${String(s % 60).padStart(2, '0')}`
                          })()}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] mono-brutal text-subtext truncate mt-1">
                      <span className="bg-muted px-1.5 py-0.5 rounded border border-line">{k.key_type || 'apikey'}</span>
                      <code className="text-subtext ml-1.5">{k.masked}</code>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <IconBtn onClick={() => ctx.handleDeleteKey(k.id)} color={C.danger} title="Delete key" disabled={ctx.deletingKey === k.id}>
                      {ctx.deletingKey === k.id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="8" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </IconBtn>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Add Key */}
        {data.type !== 'oauth' && (
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-t-2 border-line">
            <button onClick={() => ctx.setShowAddModal(true)}
              className="brutal-btn bg-[#c8a2ff] text-on-accent px-3 sm:px-3.5 py-1.5 text-xs font-bold">
              + Add Key
            </button>
          </div>
        )}
      </SectionCard>

      {/* Add Key Modal */}
      {data.type !== 'oauth' && (
        <Modal open={ctx.showAddModal} onClose={() => ctx.setShowAddModal(false)}>
          <h2 className="heading-brutal text-base uppercase tracking-tight mb-4">Add Key</h2>
          {keyFormConfig[data.id] ? (
            <div className="space-y-3">
              {keyFormConfig[data.id].fields.map(f => (
                <div key={f.key}>
                  <label className="text-[10px] mono-brutal text-subtext mb-1 block font-bold uppercase">{f.label}</label>
                  <input type="text" value={ctx.keyFields[f.key] || ''} onChange={e => ctx.setKeyFields(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 border-2 border-line rounded-lg text-xs mono-brutal bg-surface placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff3d81]" />
                </div>
              ))}
            </div>
          ) : (
            <textarea value={ctx.newKeyValue} onChange={e => ctx.setNewKeyValue(e.target.value)}
              placeholder="One key per line, or pipe: label | key_value"
              className="w-full px-3 py-2 border-2 border-line rounded-lg text-xs mono-brutal bg-surface placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff3d81] h-24 resize-none" />
          )}
          <div className="flex items-center justify-end gap-2 mt-4">
            <button onClick={() => ctx.setShowAddModal(false)}
              className="brutal-btn bg-surface text-ink px-3 py-1.5 text-xs font-bold">Cancel</button>
            <button onClick={ctx.handleAddKey} disabled={ctx.adding}
              className="brutal-btn bg-[#3ddc97] text-on-accent px-4 py-1.5 text-xs font-bold disabled:opacity-40">
              {ctx.adding ? 'Adding...' : 'Add'}
            </button>
          </div>
        </Modal>
      )}

      {/* Test Result Modal */}
      {testResult && (
        <Modal open={true} onClose={() => ctx.setTestResult(null)}>
          <h2 className="heading-brutal text-base uppercase tracking-tight mb-4">Test Result</h2>
          <div className="space-y-2.5 text-[11px] mono-brutal">
            <div className="flex justify-between items-center pb-2 border-b-2 border-line">
              <span className="text-subtext font-bold">STATUS</span>
              <span className="font-bold px-2.5 py-0.5 rounded-full border-2 border-line"
                style={{ backgroundColor: testResult.ok ? C.success : C.danger, color: testResult.ok ? C.ink : '#ffffff' }}>
                {testResult.ok ? 'OK' : 'FAIL'}
              </span>
            </div>
            {testResult.error && (
              <div className="pb-2 border-b-2 border-line">
                <span className="text-subtext font-bold">ERROR</span>
                <div className="text-[#ff6b5e] mt-1.5 break-all max-h-24 overflow-y-auto bg-[#ff6b5e]/10 p-2 rounded-lg border-2 border-[#ff6b5e]">{testResult.error}</div>
              </div>
            )}
            <div className="flex justify-between"><span className="text-subtext">Latency</span>
              <span className="text-ink font-bold">{testResult.latency_ms}ms</span></div>
            <div className="flex justify-between"><span className="text-subtext">Tokens</span>
              <span className="text-ink font-bold">{testResult.total_tokens} (in: {testResult.prompt_tokens}, out: {testResult.completion_tokens})</span></div>
            {testResult.response && (
              <div className="mt-2 p-3 rounded-lg bg-muted border-2 border-line text-subtext max-h-32 overflow-y-auto">
                <code className="text-[9px]">{testResult.response}</code>
              </div>
            )}
          </div>
          <button onClick={() => ctx.setTestResult(null)} className="brutal-btn w-full mt-4 bg-surface text-ink px-4 py-2 text-xs font-bold">Close</button>
        </Modal>
      )}

      {/* Add Model Modal */}
      <Modal open={showAddModel} onClose={() => { setShowAddModel(false); setModelError('') }}>
        <h2 className="heading-brutal text-base uppercase tracking-tight mb-4">Add Model</h2>
        {modelError && <div className="mb-3 rounded-lg border-2 border-[#ff6b5e] bg-[#ff6b5e]/10 px-3 py-2 text-[10px] mono-brutal text-[#ff6b5e] font-bold">{modelError}</div>}
        <div className="space-y-3">
          <div>
            <label className="text-[10px] mono-brutal text-subtext mb-1 block font-bold uppercase">Model ID</label>
            <input value={newModel.model_id} onChange={e => setNewModel(f => ({ ...f, model_id: e.target.value }))}
              placeholder="model-name"
              className="w-full px-3 py-2 border-2 border-line rounded-lg text-xs mono-brutal bg-surface placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff3d81]" />
          </div>
          <div>
            <label className="text-[10px] mono-brutal text-subtext mb-1 block font-bold uppercase">Context Length</label>
            <input type="number" value={newModel.ctx} onChange={e => setNewModel(f => ({ ...f, ctx: +e.target.value }))}
              className="w-full px-3 py-2 border-2 border-line rounded-lg text-xs mono-brutal bg-surface focus:outline-none focus:ring-2 focus:ring-[#ff3d81]" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setShowAddModel(false)}
            className="brutal-btn bg-surface text-ink px-3 py-1.5 text-xs font-bold">Cancel</button>
          <button onClick={async () => {
            if (!id || !newModel.model_id) return
            setModelError('')
            const result = await addCustomModelForProvider(id, newModel)
            if (!result.ok) {
              setModelError(result.error === 'duplicate_model' ? 'Model already exists' : (result.message || 'Failed to add model'))
              return
            }
            setShowAddModel(false)
            setNewModel({ model_id: '', ctx: 256000 })
            setCmKey(k => k + 1)
          }} disabled={!newModel.model_id}
            className="brutal-btn bg-[#3ddc97] text-on-accent px-4 py-1.5 text-xs font-bold disabled:opacity-40">
            Add
          </button>
        </div>
      </Modal>

      {/* OAuth Modal */}
      <OAuthConnectModal
        open={ctx.showOAuth}
        provider={providerInfo}
        onClose={() => ctx.setShowOAuth(false)}
        onSuccess={() => { ctx.setShowOAuth(false); ctx.load() }}
      />
    </div>
  )
}

const keyFormConfig: Record<string, { fields: { key: string; label: string; placeholder: string }[] }> = {
  cf: { fields: [
    { key: 'apiKey', label: 'API Token', placeholder: 'cf_api_token_xxx' },
    { key: 'accountId', label: 'Account ID', placeholder: 'your_account_uuid' },
  ]},
}
