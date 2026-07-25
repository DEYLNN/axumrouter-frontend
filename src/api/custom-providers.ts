import { fetcher } from './client'

export interface CustomProvider {
  id: string
  name: string
  prefix: string
  base_url: string
  validate_url: string
  color: string
  total_keys: number
  active_keys: number
  timeout_secs: number
  first_chunk_timeout_secs: number
  stall_timeout_secs: number
  models: CustomModel[]
  created_at: string
}

export interface CustomModel {
  id: string
  ctx: number
  vision: boolean
  tools: boolean
}

export const listCustomProviders = () => fetcher<CustomProvider[]>('/custom-providers')

export const getCustomProvider = (id: string) => fetcher<CustomProvider>(`/custom-providers/${id}`)

export const createCustomProvider = (data: {
  id: string; name: string; prefix: string; base_url: string
  validate_url?: string; color?: string
  timeout_secs?: number; first_chunk_timeout_secs?: number; stall_timeout_secs?: number
  models?: { model_id: string; ctx?: number; vision?: boolean; tools?: boolean }[]
}) => fetcher<{ ok: boolean; id: string }>('/custom-providers', {
  method: 'POST', body: JSON.stringify(data),
})

export const deleteCustomProvider = (id: string) =>
  fetcher<{ ok: boolean }>(`/custom-providers/${id}`, { method: 'DELETE' })

export const addCustomModel = (providerId: string, model: { model_id: string; ctx?: number; vision?: boolean; tools?: boolean }) =>
  fetcher<{ ok: boolean }>(`/custom-providers/${providerId}/models`, {
    method: 'POST', body: JSON.stringify(model),
  })

export const removeCustomModel = (providerId: string, modelId: string) =>
  fetcher<{ ok: boolean }>(`/custom-providers/${providerId}/models/${modelId}`, { method: 'DELETE' })
