import { useState, useEffect } from 'react'
import { getProviders } from '../api'
import { apiFetch } from '../api'
import { useAsync } from '../hooks/useAsync'
import { Loading } from '../components/Loading'
import { ErrorBox } from '../components/ErrorBox'
import ModelsSection from '../components/ModelsSection'

interface ToggleModel { id: string; owned_by: string; enabled: boolean; toggling?: boolean }

export default function Models() {
  const { data: providers, loading, error } = useAsync(getProviders, [])
  const [models, setModels] = useState<Record<string, ToggleModel[]>>({})
  const [stats, setStats] = useState({ totalModels: 0, disabledModels: 0, blockedModels: 0 })

  useEffect(() => {
    if (!providers) return
    const fetchModels = async () => {
      try {
        const r = await apiFetch('/models/all')
        const data: Record<string, { id: string; enabled: boolean; owned_by: string; context_length?: number | null }[]> = await r.json()
        const mapped: Record<string, ToggleModel[]> = {}
        for (const [prov, list] of Object.entries(data)) {
          mapped[prov] = list.map(m => ({ id: m.id, owned_by: m.owned_by || prov, enabled: m.enabled, context_length: (m as any).context_length }))
        }
        if (providers) {
          for (const p of providers) {
            if (p.type === 'custom_openai' && p.id.startsWith('custom_')) {
              const prefix = p.id.replace('custom_', '')
              if (mapped[prefix] && !mapped[p.id]) {
                mapped[p.id] = mapped[prefix]
              }
            }
            if (!mapped[p.id]) {
              mapped[p.id] = []
            }
          }
        }
        setModels(mapped)
      } catch { /* noop */ }
    }
    fetchModels()
  }, [providers])

  useEffect(() => {
    if (Object.keys(models).length === 0) return
    let cancelled = false
    apiFetch('/models/blocked').then(r => r.json()).catch(() => []).then(blocked => {
      if (cancelled) return
      let total = 0, dCount = 0
      for (const list of Object.values(models)) {
        for (const m of list) { total++; if (!m.enabled) dCount++ }
      }
      setStats({ totalModels: total, disabledModels: dCount, blockedModels: Array.isArray(blocked) ? blocked.length : 0 })
    })
    return () => { cancelled = true }
  }, [models])

  const toggleModel = async (modelId: string, enabled: boolean) => {
    const prevState: Record<string, ToggleModel[]> = {}
    setModels(prev => {
      for (const [prov, list] of Object.entries(prev)) prevState[prov] = list
      const next: Record<string, ToggleModel[]> = {}
      for (const [prov, list] of Object.entries(prev)) {
        const idx = list.findIndex(m => m.id === modelId)
        if (idx > -1) { const nl = [...list]; nl[idx] = { ...nl[idx], enabled, toggling: true }; next[prov] = nl }
        else { next[prov] = list }
      }
      return next
    })
    try {
      const res = await apiFetch('/models/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model_id: modelId, enabled }) })
      const data = await res.json()
      if (!data.ok) throw new Error('fail')
      setModels(prev => {
        const next: Record<string, ToggleModel[]> = {}
        for (const [prov, list] of Object.entries(prev)) {
          const idx = list.findIndex(m => m.id === modelId)
          if (idx > -1) { const nl = [...list]; nl[idx] = { ...nl[idx], toggling: false }; next[prov] = nl }
          else { next[prov] = list }
        }
        return next
      })
    } catch (err) {
      console.error('[toggleModel] failed:', modelId, enabled, err)
      setModels(prevState)
    }
  }

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />

  return (
    <div className="space-y-6">
      <h1 className="heading-brutal text-3xl uppercase tracking-tight">MODELS</h1>
      <p className="text-lg font-medium text-subtext">Enable / disable models per provider</p>
      <ModelsSection providers={providers} models={models} onToggleModel={toggleModel} />
    </div>
  )
}
