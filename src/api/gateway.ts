import { fetcher } from './client'
import type { GatewayKey } from './types'

export const getGatewayKeys = () => fetcher<GatewayKey[]>('/gateway_keys')
export const createGatewayKey = (label: string) =>
  fetcher<{ success: boolean; message: string; id?: string; key_value?: string }>('/gateway_keys', {
    method: 'POST', body: JSON.stringify({ label }),
  })
export const deleteGatewayKey = (id: string) =>
  fetcher<{ success: boolean; message: string }>(`/gateway_keys/${id}`, { method: 'DELETE' })
export const updateGatewayKey = (id: string, data: { label?: string; is_active?: boolean }) =>
  fetcher<{ success: boolean; message: string }>(`/gateway_keys/${id}`, {
    method: 'PATCH', body: JSON.stringify(data),
  })
