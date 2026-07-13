import { fetcher } from './client'
import type { ProviderMeta, ProviderDetail, TestResult } from './types'

export const getProviders = () => fetcher<ProviderMeta[]>('/providers')
export const getProviderDetail = (id: string) => fetcher<ProviderDetail>(`/providers/${id}`)

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
