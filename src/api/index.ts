// API layer — barrel re-export
// All domain files import from './client' and './types', not from here.

export { API_BASE, fetcher, apiFetch, iconUrl } from './client'

// Types
export type {
  SettingsData, ProviderMeta, ProviderDetail, ModelInfo, KeyInfo,
  ApiResponse, GatewayKey, DatabaseInfo, TestResult,
  RateLimit, ValidateModelsResponse, LogEntry, AuthFile,
} from './types'

// Domain functions
export { getSettings, toggleSetting } from './settings'
export { getProviders, getProviderDetail, validateModels, blockModel, unblockModel, testModel, listCustomModels, addCustomModelForProvider, removeCustomModelForProvider } from './providers'
export { listCustomProviders, createCustomProvider, deleteCustomProvider, getCustomProvider, addCustomModel, removeCustomModel } from './custom-providers'
export { getKeys, addKey, deleteKey } from './keys'
export { getGatewayKeys, createGatewayKey, deleteGatewayKey, updateGatewayKey } from './gateway'
export { startOAuth, exchangeOAuth } from './oauth'
export { getDatabaseInfo, exportDatabase, importDatabase } from './database'
export { getUsageStats, getUsageKeys, getLogs, clearLogs } from './usage'
// Auth-files
export { getAuthFiles, getKeysStats, dedupeKeys } from './auth-files'
