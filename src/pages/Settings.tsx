import { useState, useEffect } from 'react'
import { getSettings, getDatabaseInfo } from '../api'
import { apiFetch } from '../api'
import { useAsync } from '../hooks/useAsync'
import { Loading } from '../components/Loading'
import { ErrorBox } from '../components/ErrorBox'
import DatabaseSection from '../components/DatabaseSection'
import GatewayKeysSection from '../components/GatewayKeysSection'

interface GatewayKeyJson {
  id: string; key_value: string; label: string | null; is_active: number
  access_type: string; allowed_models: string[]; max_tokens: number; created_at: string
}

export default function Settings() {
  const { data: settings, loading, error } = useAsync(getSettings, [])
  const { data: dbInfo, refetch: reloadDb } = useAsync(getDatabaseInfo, [])
  const [gwKeys, setGwKeys] = useState<GatewayKeyJson[]>([])

  const fetchGw = () => { apiFetch('/gateway_keys').then(r => r.ok ? r.json() : Promise.reject(r.status)).then(setGwKeys).catch((e) => console.error('[fetchGw] failed:', e)) }
  useEffect(() => { fetchGw() }, [])

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />
  if (!settings) return null

  return (
    <div className="space-y-6">
      <h1 className="heading-brutal text-3xl uppercase tracking-tight">CONFIG</h1>
      <p className="text-lg font-medium text-subtext">Gateway configuration</p>
      <DatabaseSection dbInfo={dbInfo} stats={{ totalModels: 0, disabledModels: 0, blockedModels: 0 }} onDbReload={reloadDb} />
      <GatewayKeysSection keys={gwKeys} onRefresh={fetchGw} />
    </div>
  )
}
