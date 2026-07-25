import { fetcher } from './client'
import type { AuthFile } from './types'

export interface AuthFilesQuery {
  page?: number
  per_page?: number
  query?: string
  provider_id?: string
  only_problem?: boolean
  only_disabled?: boolean
}

export interface AuthFilesResponse {
  files: AuthFile[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export const getAuthFiles = (q?: AuthFilesQuery) => {
  const params = new URLSearchParams()
  if (q?.page) params.set('page', String(q.page))
  if (q?.per_page) params.set('per_page', String(q.per_page))
  if (q?.query) params.set('query', q.query)
  if (q?.provider_id && q.provider_id !== 'all') params.set('provider_id', q.provider_id)
  if (q?.only_problem) params.set('only_problem', 'true')
  if (q?.only_disabled) params.set('only_disabled', 'true')
  const qs = params.toString()
  return fetcher<AuthFilesResponse>(`/auth-files${qs ? `?${qs}` : ''}`)
}
