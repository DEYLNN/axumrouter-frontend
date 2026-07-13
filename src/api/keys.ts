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
