export interface SettingsData {
  rtk_enabled: string
  caveman_enabled: string
  ponytail_enabled: string
  gateway_timeout: number
  public_ip: string
  public_url: string
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
  icon_name: string
  color: string
  oauth_flow: string | null
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

export interface GatewayKey {
  id: string
  key_value: string
  label: string | null
  is_active: number
  created_at: string
}

export interface DatabaseInfo {
  url: string
  size_bytes: number
  size_mb: number
  tables: { name: string; rows: number; row_count: number }[]
  total_rows: number
  backup_count: number
}

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

export interface TestResult {
  ok: boolean
  response: string
  model: string
  latency_ms: number
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  error: string | null
}

export interface OAuthKey {
  id: string
  provider_id: string
  label: string | null
}

export interface RateLimit {
  name: string
  limit: number
  remaining: number
  used: number
  period_seconds: number | null
  reset_at: string | null
}

export interface QuotaData {
  provider_id?: string
  error?: string | null
  expires_at?: string | null
  last_refresh?: string | null
  key_plan?: string | null
  rate_limits?: RateLimit[]
}

export interface ExportResult {
  tables: Record<string, any[]>
  meta: { exported_at: string; version: string }
}
