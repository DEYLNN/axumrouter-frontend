import { useEffect, useState } from 'react'
import { getSettings } from '../api'
import type { SettingsData } from '../api'

export default function Dashboard() {
  const [settings, setSettings] = useState<SettingsData | null>(null)

  useEffect(() => {
    getSettings().then(s => setSettings(s)).catch(() => {})
  }, [])

  const baseUrl = settings?.public_url || import.meta.env.VITE_GATEWAY_BACKEND_URL || '—'

  return (
    <div className="relative">
      <div className="space-y-5">
        <div className="mb-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent"
            style={{ textShadow: '0 0 30px rgba(6,182,212,0.3)' }}>
            DASHBOARD
          </h1>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5">Gateway overview</p>
        </div>

        {/* Base URL card */}
        <div className="border border-white/[0.06] rounded-xl bg-[#0a0f1e]/60 backdrop-blur-xl overflow-hidden"
          style={{ boxShadow: 'inset 0 1px 0 rgba(6,182,212,0.06), 0 0 20px rgba(6,182,212,0.03)' }}>
          <div className="px-5 py-3 border-b border-white/[0.04]">
            <h2 className="text-xs font-mono font-bold text-cyan-400 tracking-wider"
              style={{ textShadow: '0 0 10px rgba(6,182,212,0.3)' }}>BASE_URL</h2>
          </div>
          <div className="px-5 py-4">
            <code className="block text-sm font-mono text-slate-200 bg-black/40 rounded-lg px-4 py-2.5 border border-white/[0.06] truncate"
              style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }}>
              {baseUrl}
            </code>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'ENDPOINT', path: '/admin/endpoint', desc: 'Gateway URL & keys' },
            { label: 'PROVIDERS', path: '/admin/providers', desc: 'Manage LLM providers' },
            { label: 'SETTINGS', path: '/admin/settings', desc: 'Global configuration' },
          ].map(c => (
            <a key={c.path} href={c.path}
              className="border border-white/[0.06] rounded-xl bg-[#0a0f1e]/40 p-4 hover:bg-[#0a0f1e]/80 hover:border-cyan-500/30 transition-all group">
              <div className="text-xs font-mono font-bold text-slate-300 group-hover:text-cyan-300 transition-colors">{c.label}</div>
              <div className="text-[10px] font-mono text-slate-600 mt-1">{c.desc}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
