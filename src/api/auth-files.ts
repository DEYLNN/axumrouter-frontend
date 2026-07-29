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

export const getAuthFiles = (page = 1) => {
  return fetcher<{ keys: AuthFile[]; total: number }>(`/keys?page=${page}&per_page=100`)
}
