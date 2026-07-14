import { useState, useEffect } from 'react'
import { getSettings, getDatabaseInfo, getProviders } from '../api'
import { apiFetch } from '../api'
import { useAsync } from '../hooks/useAsync'
import { Loading } from '../components/Loading'
import { ErrorBox } from '../components/ErrorBox'
import DatabaseSection from '../components/DatabaseSection'
import ModelsSection from '../components/ModelsSection'
import GatewayKeysSection from '../components/GatewayKeysSection'

interface ToggleModel { id: string; owned_by: string; enabled: boolean; toggling?: boolean }
interface GatewayKeyJson {
  id: string; key_value: string; label: string | null; is_active: number
  access_type: string; allowed_models: string[]; max_tokens: number; created_at: string
}

export default function Settings() {
  const { data: settings, loading, error } = useAsync(getSettings, [])
  const { data: dbInfo, refetch: reloadDb } = useAsync(getDatabaseInfo, [])
  const { data: providers } = useAsync(getProviders, [])
  const [models, setModels] = useState<Record<string, ToggleModel[]>>({})
  const [stats, setStats] = useState({ totalModels: 0, disabledModels: 0, blockedModels: 0, totalUsage: 0 })
  const [gwKeys, setGwKeys] = useState<GatewayKeyJson[]>([])

  const fetchModels = async () => {
    if (!providers) return
    try {
      const r = await apiFetch('/models/all')
      const data: Record<string, { id: string; enabled: boolean; owned_by: string }[]> = await r.json()
      const mapped: Record<string, ToggleModel[]> = {}
      for (const [prov, list] of Object.entries(data)) {
        mapped[prov] = list.map(m => ({ id: m.id, owned_by: m.owned_by || prov, enabled: m.enabled, context_length: m.context_length }))
      }
      setModels(mapped)
    } catch (_) {}
  }

  const fetchGw = () => { apiFetch('/gateway_keys').then(r => r.json()).then(setGwKeys).catch(() => {}) }

  useEffect(() => { if (providers) fetchModels() }, [providers])
  useEffect(() => { fetchGw() }, [])

  useEffect(() => {
    Promise.all([
      apiFetch('/models/disabled').then(r => r.json()).catch(() => []),
      apiFetch('/models/blocked').then(r => r.json()).catch(() => []),
      apiFetch('/usage/stats').then(r => r.json()).catch(() => ({ total_requests: 0 })),
    ]).then(([_d, blocked, usage]) => {
      let total = 0, dCount = 0
      for (const list of Object.values(models)) {
        for (const m of list) { total++; if (!m.enabled) dCount++ }
      }
      setStats({ totalModels: total, disabledModels: dCount, blockedModels: Array.isArray(blocked) ? blocked.length : 0, totalUsage: usage?.total_requests || 0 })
    })
  }, [models])

  const toggleModel = async (modelId: string, enabled: boolean) => {
    setModels(prev => {
      const next = { ...prev }
      for (const [prov, list] of Object.entries(next)) {
        const idx = list.findIndex(m => m.id === modelId)
        if (idx > -1) { const nl = [...list]; nl[idx] = { ...nl[idx], enabled, toggling: true }; next[prov] = nl; break }
      }
      return next
    })
    try {
      const res = await apiFetch('/models/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model_id: modelId, enabled }) })
      const data = await res.json()
      if (!data.ok) throw new Error('fail')
      setModels(prev => {
        const next = { ...prev }
        for (const [prov, list] of Object.entries(next)) {
          const idx = list.findIndex(m => m.id === modelId)
          if (idx > -1) { const nl = [...list]; nl[idx] = { ...nl[idx], toggling: false }; next[prov] = nl; break }
        }
        return next
      })
    } catch (_: any) {
      setModels(prev => {
        const next = { ...prev }
        for (const [prov, list] of Object.entries(next)) {
          const idx = list.findIndex(m => m.id === modelId)
          if (idx > -1) { const nl = [...list]; nl[idx] = { ...nl[idx], enabled: !enabled, toggling: false }; next[prov] = nl; break }
        }
        return next
      })
    }
  }

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />
  if (!settings) return null

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent"
        style={{ textShadow: '0 0 30px rgba(6,182,212,0.3)' }}>CONFIG</h1>
      <DatabaseSection dbInfo={dbInfo} stats={stats} onDbReload={reloadDb} />
      <ModelsSection providers={providers} models={models} onToggleModel={toggleModel} />
      <GatewayKeysSection keys={gwKeys} onRefresh={fetchGw} />
    </div>
  )
}
