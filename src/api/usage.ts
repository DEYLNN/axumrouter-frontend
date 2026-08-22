import { fetcher } from './client'
import type { LogEntry } from './types'

export const getLogs = (page = 1, limit = 50) =>
  fetcher<{ logs: LogEntry[]; total: number; page: number; total_pages: number }>('/logs?page=' + page + '&limit=' + limit)
export const clearLogs = () => fetcher<{ ok: boolean }>('/logs/clear', { method: 'POST' })
export const getUsageStats = () =>
  fetcher<{ total_requests: number; total_prompt_tokens: number; total_completion_tokens: number; total_tokens: number }>('/usage/stats')
export const getUsageKeys = () => fetcher<{ gateway_key_id: string; label: string | null; key_value: string | null; requests: number; prompt_tokens: number; completion_tokens: number; total_tokens: number }[]>('/usage/stats/keys')
export const getOAuthKeys = () => fetcher<import('./types').OAuthKey[]>('/quota/keys')
export const getUsageQuota = (keyId: string) => fetcher<import('./types').QuotaData>(`/quota/${encodeURIComponent(keyId)}`)
export const refreshUsageKey = (keyId: string) => fetcher<{ success: boolean; message?: string; error?: string }>(`/quota/refresh/${encodeURIComponent(keyId)}`, { method: 'POST' })
