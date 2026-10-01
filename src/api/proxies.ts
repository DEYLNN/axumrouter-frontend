import { apiFetch } from './client'

export interface Proxy {
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

export async function getProxies(): Promise<Proxy[]> {
  const r = await apiFetch('/proxies')
  return r.ok ? r.json() : []
}
export async function createProxy(data: Partial<Proxy>): Promise<Proxy> {
  const r = await apiFetch('/proxies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  return r.json()
}
export async function updateProxy(id: string, data: Partial<Proxy>): Promise<Proxy> {
  const r = await apiFetch(`/proxies/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  return r.json()
}
export async function deleteProxy(id: string): Promise<void> {
  await apiFetch(`/proxies/${id}`, { method: 'DELETE' })
}
export async function toggleProxy(id: string): Promise<Proxy> {
  const r = await apiFetch(`/proxies/${id}/toggle`, { method: 'POST' })
  return r.json()
}
