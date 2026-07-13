import { fetcher } from './client'
import type { SettingsData } from './types'

export const getSettings = () => fetcher<SettingsData>('/settings')
export const toggleSetting = (key: string, value: string) =>
  fetcher<{ ok: boolean }>('/settings/toggle', {
    method: 'POST',
    body: JSON.stringify({ key, value }),
  })
