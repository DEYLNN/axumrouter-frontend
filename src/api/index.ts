const API_BASE = '/admin/api'

async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export interface SettingsData {
  rtk_enabled: string
  caveman_enabled: string
  gateway_timeout: number
  public_ip: string
  port: number
  server_host: string
  api_key_header: string
  api_key_prefix: string
  database_url: string
  proxy_count: number
  keys_count: number
}

export interface ProviderMeta {
  id: string
  name: string
  display_name: string
  total_keys: number
  active_keys: number
  locked_keys: number
  type: string
  icon_url: string
  color: string
}

export interface ProviderDetail extends ProviderMeta {
  models: ModelInfo[]
  keys: KeyInfo[]
  capabilities: string[]
  base_url?: string
}

export interface ModelInfo {
  id: string
  name: string
  available: boolean
  blocked: boolean
}

export interface KeyInfo {
  id: string
  label: string
  masked: string
  key_type: string
  is_locked: boolean
  locked_reason: string
  locked_remaining: number
}

export interface LogEntry {
  id: string
  provider_id: string
  api_key_id: string
  key_label: string | null
  model_id: string
  status: string
  status_code: number | null
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  latency_ms: number | null
  error_message: string | null
  request_body: string | null
  response_body: string | null
  created_at: string
}

export interface ApiResponse<T> {
  ok: boolean
  data?: T
  error?: string
}

// Settings
export const getSettings = () => fetcher<SettingsData>('/settings')
export const toggleSetting = (key: string, value: string) =>
  fetcher<{ ok: boolean }>('/settings/toggle', {
    method: 'POST',
    body: JSON.stringify({ key, value }),
  })

// Providers
export const getProviders = () => fetcher<ProviderMeta[]>('/providers')
export const getProviderDetail = (id: string) => fetcher<ProviderDetail>(`/providers/${id}`)

// Keys
export const getKeys = (provider: string) => fetcher<KeyInfo[]>(`/keys/${provider}`)
export const deleteKey = (provider: string, keyId: string) =>
  fetcher<{ ok: boolean }>('/keys/delete', {
    method: 'POST',
    body: JSON.stringify({ provider_id: provider, key_id: keyId }),
  })
export const addKey = (providerId: string, keyValue: string, label: string) =>
  fetcher<{ success: boolean; message: string }>('/keys', {
    method: 'POST',
    body: JSON.stringify({ provider_id: providerId, key_value: keyValue, label }),
  })

// Gateway Keys
export interface GatewayKey {
  id: string
  key_value: string
  label: string | null
  is_active: number
  created_at: string
}

export const getGatewayKeys = () => fetcher<GatewayKey[]>('/gateway_keys')
export const createGatewayKey = (label: string) =>
  fetcher<{ success: boolean; message: string; id?: string; key_value?: string }>('/gateway_keys', {
    method: 'POST',
    body: JSON.stringify({ label }),
  })
export const deleteGatewayKey = (id: string) =>
  fetcher<{ success: boolean; message: string }>(`/gateway_keys/${id}`, {
    method: 'DELETE',
  })
export const updateGatewayKey = (id: string, data: { label?: string; is_active?: boolean }) =>
  fetcher<{ success: boolean; message: string }>(`/gateway_keys/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

// Model block/unblock
export const blockModel = (providerId: string, modelId: string) =>
  fetcher<{ ok: boolean; message: string }>(`/providers/${providerId}/block`, {
    method: 'POST',
    body: JSON.stringify({ model: modelId }),
  })
export const unblockModel = (providerId: string, modelId: string) =>
  fetcher<{ ok: boolean; message: string }>(`/providers/${providerId}/unblock`, {
    method: 'POST',
    body: JSON.stringify({ model: modelId }),
  })

// Test model
export function testModel(providerId: string, model: string): Promise<{
  ok: boolean
  response: string
  model: string
  latency_ms: number
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  error: string | null
}> {
  return fetcher(`/providers/${providerId}/test`, {
    method: 'POST',
    body: JSON.stringify({ model }),
  })
}

// OAuth
export async function startOAuth(provider: string): Promise<{ id: string; url: string }> {
  const res = await fetch(`/admin/oauth/${provider}/start`)
  if (!res.ok) throw new Error(`OAuth start failed: ${res.status}`)
  return res.json()
}

export async function exchangeOAuth(provider: string, id: string, code: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`/admin/oauth/${provider}/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, code }),
  })
  if (!res.ok) throw new Error(`OAuth exchange failed: ${res.status}`)
  return res.json()
}

export const getLogs = (page = 1, limit = 50) =>
  fetcher<{ logs: LogEntry[]; total: number; page: number; total_pages: number }>(
    `/logs?page=${page}&limit=${limit}`
  )

export const clearLogs = () =>
  fetcher<{ ok: boolean }>('/logs/clear', { method: 'POST' })

// Usage / Stats
export const getUsageStats = () =>
  fetcher<{ total_requests: number; total_prompt_tokens: number; total_completion_tokens: number; total_tokens: number; success_count: number; error_count: number }>('/usage/stats')

export const getUsageKeys = () => fetcher<any[]>('/usage/keys')

export const getUsageQuota = (keyId: string) =>
  fetcher<{ plan: string | null; rate_limits: any[]; error: string | null }>(`/usage/quota/${keyId}`)

export const refreshUsageKey = (keyId: string) =>
  fetcher<{ success: boolean; message?: string; error?: string }>(`/usage/refresh/${keyId}`, { method: 'POST' })

// Database
export interface DatabaseInfo {
  url: string
  size_bytes: number
  size_mb: number
  tables: { name: string; rows: number; row_count: number }[]
  total_rows: number
  backup_count: number
}

export const getDatabaseInfo = () => fetcher<DatabaseInfo>('/database')

export const exportDatabase = () => fetcher<any>('/database/export')

export const importDatabase = (data: any, replace = true) =>
  fetcher<{ ok: boolean; imported: number; errors: number; error_details: string[] }>('/database/import', {
    method: 'POST',
    body: JSON.stringify({ tables: data, replace }),
  })

// Auth Files
export interface AuthFile {
  id: string
  provider_id: string
  label: string
  key_type: string
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

export const getAuthFiles = () => fetcher<{ files: AuthFile[] }>('/auth-files')
