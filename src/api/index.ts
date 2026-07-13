// API layer — barrel re-export
// All domain files import from './client' and './types', not from here.

export { API_BASE, fetcher, apiFetch } from './client'

// Types
export type {
  SettingsData, ProviderMeta, ProviderDetail, ModelInfo, KeyInfo,
  LogEntry, ApiResponse, GatewayKey, DatabaseInfo, AuthFile,
} from './types'

// Domain functions
export { getSettings, toggleSetting } from './settings'
export { getProviders, getProviderDetail, blockModel, unblockModel, testModel } from './providers'
export { getKeys, addKey, deleteKey } from './keys'
export { getGatewayKeys, createGatewayKey, deleteGatewayKey, updateGatewayKey } from './gateway'
export { startOAuth, exchangeOAuth } from './oauth'
export { getLogs, clearLogs, getUsageStats, getUsageKeys, getUsageQuota, refreshUsageKey } from './usage'
export { getDatabaseInfo, exportDatabase, importDatabase } from './database'
export { getAuthFiles } from './auth-files'
