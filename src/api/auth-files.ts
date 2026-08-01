import { fetcher } from './client'
import type { AuthFile } from './types'

export interface AuthFilesQuery {
  page?: number
  per_page?: number
  query?: string
  provider_id?: string
  only_problem?: boolean
  only_disabled?: boolean
  status_code?: string | number  // 'all' or specific code
}

export interface AuthFilesResponse {
  keys: AuthFile[]
  total: number
  page: number
  per_page: number
}

export const getAuthFiles = (params: AuthFilesQuery) => {
  const qs = new URLSearchParams()
  qs.set('page', String(params.page ?? 1))
  qs.set('per_page', String(params.per_page ?? 50))
  if (params.query) qs.set('query', params.query)
  if (params.provider_id && params.provider_id !== 'all') qs.set('provider_id', params.provider_id)
  if (params.only_problem) qs.set('only_problem', '1')
  if (params.only_disabled) qs.set('only_disabled', '1')
  if (params.status_code != null && params.status_code !== 'all') qs.set('status_code', String(params.status_code))
  return fetcher<AuthFilesResponse>(`/keys?${qs}`)
}

export const toggleAuthFile = (keyId: string, isActive: boolean) =>
  fetcher<{ success: boolean; message: string }>(`/keys/toggle`, {
    method: 'POST', body: JSON.stringify({ key_id: keyId, is_active: isActive }),
  })

export const bulkEnableKeys = (keyIds: string[]) =>
  fetcher<{ success: boolean; enabled: number; failed: number; message: string }>(`/keys/bulk-enable`, {
    method: 'POST', body: JSON.stringify({ key_ids: keyIds }),
  })
