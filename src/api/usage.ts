import { fetcher } from './client'
import type { LogEntry, OAuthKey, QuotaData } from './types'

export const getLogs = (page = 1, limit = 50) =>
  fetcher<{ logs: LogEntry[]; total: number; page: number; total_pages: number }>(`/logs?page=${page}&limit=${limit}`)
export const clearLogs = () => fetcher<{ ok: boolean }>('/logs/clear', { method: 'POST' })

export const getUsageStats = () =>
  fetcher<{ total_requests: number; total_prompt_tokens: number; total_completion_tokens: number; total_tokens: number; success_count: number; error_count: number }>('/usage/stats')
export const getUsageKeys = () => fetcher<OAuthKey[]>('/usage/keys')
export const getUsageQuota = (keyId: string) =>
  fetcher<QuotaData>(`/usage/quota/${keyId}`)
export const refreshUsageKey = (keyId: string) =>
  fetcher<{ success: boolean; message?: string; error?: string }>(`/usage/refresh/${keyId}`, { method: 'POST' })
