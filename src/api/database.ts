import { fetcher } from './client'
import type { DatabaseInfo } from './types'

export const getDatabaseInfo = () => fetcher<DatabaseInfo>('/database')
export const exportDatabase = () => fetcher<any>('/database/export')
export const importDatabase = (data: any, replace = true) =>
  fetcher<{ ok: boolean; imported: number; errors: number; error_details: string[] }>('/database/import', {
    method: 'POST', body: JSON.stringify({ tables: data, replace }),
  })
