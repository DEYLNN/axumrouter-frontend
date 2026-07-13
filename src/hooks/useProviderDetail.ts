import { useState, useCallback } from 'react'
import { getProviderDetail, blockModel, unblockModel, addKey, deleteKey, testModel } from '../api'
import type { ProviderDetail as ProviderDetailType } from '../api'
import { copyToClipboard } from '../utils/clipboard'

const keyFormConfig: Record<string, { fields: { key: string; label: string; placeholder: string }[] }> = {
  cf: { fields: [
    { key: 'apiKey', label: 'API Token', placeholder: 'cf_api_token_xxx' },
    { key: 'accountId', label: 'Account ID', placeholder: 'your_account_uuid' },
  ]},
}

export function useProviderDetail(id: string | undefined) {
  const [data, setData] = useState<ProviderDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState('')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [keyFields, setKeyFields] = useState<Record<string, string>>({})
  const [adding, setAdding] = useState(false)
  const [deletingKey, setDeletingKey] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showOAuth, setShowOAuth] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<any>(null)

  const load = useCallback(() => {
    if (!id) return
    getProviderDetail(id)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleToggle = async (modelId: string, currentlyBlocked: boolean) => {
    if (!id) return
    setToggling(modelId)
    try {
      if (currentlyBlocked) await unblockModel(id, modelId)
      else await blockModel(id, modelId)
      await load()
    } catch (e: any) { setError(e.message) }
    setToggling(null)
  }

  const copy = async (val: string) => {
    await copyToClipboard(val)
    setCopiedId(val)
    setTimeout(() => setCopiedId(''), 1800)
  }

  const handleAddKey = async () => {
    if (!id) return
    setAdding(true)
    try {
      const formCfg = keyFormConfig[id]
      if (formCfg) {
        const missing = formCfg.fields.find(f => !keyFields[f.key]?.trim())
        if (missing) { setError(`${missing.label} required`); setAdding(false); return }
        const obj: Record<string, string> = {}
        formCfg.fields.forEach(f => { obj[f.key] = keyFields[f.key].trim() })
        const kv = JSON.stringify(obj)
        const label = id + '-' + (keyFields[formCfg.fields[0].key]?.slice(0, 8) || 'key')
        await addKey(id, kv, label)
        setNewKeyValue(''); setKeyFields({})
      } else {
        const lines = newKeyValue.trim().split('\n').map(l => l.trim()).filter(Boolean)
        for (const line of lines) {
          const pipeIdx = line.indexOf('|')
          if (pipeIdx > -1) await addKey(id, line.slice(pipeIdx + 1).trim(), line.slice(0, pipeIdx).trim())
          else await addKey(id, line, id + '-' + line.slice(0, 8))
        }
        setNewKeyValue('')
      }
      await load()
    } catch (e: any) { setError(e.message) }
    setAdding(false)
  }

  const handleDeleteKey = async (keyId: string) => {
    if (!id) return
    setDeletingKey(keyId)
    try { await deleteKey(id, keyId); await load() }
    catch (e: any) { setError(e.message) }
    setDeletingKey('')
  }

  const handleTest = async (modelName: string) => {
    if (!id) return
    setTesting(modelName); setTestResult(null)
    try { setTestResult(await testModel(id, modelName)) }
    catch (e: any) { setTestResult({ ok: false, error: e.message, latency_ms: 0, prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, response: '' }) }
    setTesting(null)
  }

  return {
    data, loading, error, toggling, copiedId,
    newKeyValue, setNewKeyValue, keyFields, setKeyFields,
    adding, deletingKey, showAddModal, setShowAddModal,
    showOAuth, setShowOAuth, testing, testResult, setTestResult,
    load, handleToggle, copy, handleAddKey, handleDeleteKey, handleTest,
  }
}
