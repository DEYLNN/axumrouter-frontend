import { fetcher } from './client'
import type { ProviderMeta, ProviderDetail, TestResult, ValidateModelsResponse, CustomModelRow } from './types'

export const getProviders = () => fetcher<ProviderMeta[]>('/providers')
export const getProviderDetail = (id: string) => fetcher<ProviderDetail>(`/providers/${id}`)
export const validateModels = (id: string, keyId?: string) => {
  const params = keyId ? `?key_id=${encodeURIComponent(keyId)}` : ''
  return fetcher<ValidateModelsResponse>(`/providers/${id}/validate-models${params}`)
}

export const blockModel = (providerId: string, modelId: string) =>
  fetcher<{ ok: boolean; message: string }>(`/providers/${providerId}/block`, {
    method: 'POST', body: JSON.stringify({ model: modelId }),
  })
export const unblockModel = (providerId: string, modelId: string) =>
  fetcher<{ ok: boolean; message: string }>(`/providers/${providerId}/unblock`, {
    method: 'POST', body: JSON.stringify({ model: modelId }),
  })

export function testModel(providerId: string, model: string): Promise<TestResult> {
  return fetcher<TestResult>(`/providers/${providerId}/test`, {
    method: 'POST', body: JSON.stringify({ model }),
  })
}

// Custom Models — per-provider user-added model entries (runtime merge)
export const listCustomModels = (id: string) => fetcher<CustomModelRow[]>(`/providers/${id}/custom-models`)
export const addCustomModelForProvider = (id: string, model: { model_id: string; ctx?: number; vision?: boolean; tools?: boolean }) =>
  fetcher<{ ok: boolean }>(`/providers/${id}/custom-models`, {
    method: 'POST', body: JSON.stringify(model),
  })
export const removeCustomModelForProvider = (id: string, modelId: string) =>
  fetcher<{ ok: boolean }>(`/providers/${id}/custom-models/${encodeURIComponent(modelId)}`, {
    method: 'DELETE',
  })
