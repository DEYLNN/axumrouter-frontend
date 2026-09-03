import { fetcher } from './client'
import type { KeyInfo } from './types'

export const getKeys = (provider: string) => fetcher<KeyInfo[]>(`/keys/${provider}`)
export const deleteKey = (provider: string, keyId: string) =>
  fetcher<{ ok: boolean }>('/keys/delete', {
    method: 'POST', body: JSON.stringify({ provider_id: provider, key_id: keyId }),
  })
export const addKey = (providerId: string, keyValue: string, label: string) =>
  fetcher<{ success: boolean; message: string }>('/keys', {
    method: 'POST', body: JSON.stringify({ provider_id: providerId, key_value: keyValue, label }),
  })
export const bulkAddKeys = (providerId: string, keys: string[], label?: string) =>
  fetcher<{ added: number; duplicates: number; total: number; message: string }>('/keys/bulk-add', {
    method: 'POST', body: JSON.stringify({ provider_id: providerId, keys, label }),
  })
export const toggleKey = (keyId: string, isActive: boolean) =>
  fetcher<{ success: boolean; message: string }>('/keys/toggle', {
    method: 'POST', body: JSON.stringify({ key_id: keyId, is_active: isActive }),
  })
