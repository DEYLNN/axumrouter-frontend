import { fetcher } from './client'
import type { ProviderMeta, ProviderDetail } from './types'

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

export function testModel(providerId: string, model: string): Promise<{
  ok: boolean; response: string; model: string; latency_ms: number;
  prompt_tokens: number; completion_tokens: number; total_tokens: number; error: string | null
}> {
  return fetcher(`/providers/${providerId}/test`, {
    method: 'POST', body: JSON.stringify({ model }),
  })
}
