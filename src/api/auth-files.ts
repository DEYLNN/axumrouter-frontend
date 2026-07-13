import { fetcher } from './client'
import type { AuthFile } from './types'

export const getAuthFiles = () => fetcher<{ files: AuthFile[] }>('/auth-files')
