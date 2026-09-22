import { apiFetch } from './client'

export interface UnslothModel {
  id: string
  label: string
  base_url: string
  api_key: string
  upstream_model: string
  context_length: number
  supports_tools: boolean
  supports_vision: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function listUnslothModels(): Promise<UnslothModel[]> {
  const res = await apiFetch('/unsloth/models')
  return res.json()
}

export async function getUnslothModel(id: string): Promise<UnslothModel | null> {
  const res = await apiFetch(`/unsloth/models/${id}`)
  return res.json()
}

export async function createUnslothModel(data: {
  id: string; label: string; base_url: string; api_key: string;
  upstream_model: string; context_length?: number;
  supports_tools?: boolean; supports_vision?: boolean;
}): Promise<void> {
  await apiFetch('/unsloth/models', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateUnslothModel(id: string, data: {
  label: string; base_url: string; api_key: string;
  upstream_model: string; context_length?: number;
  supports_tools?: boolean; supports_vision?: boolean; is_active?: boolean;
}): Promise<void> {
  await apiFetch(`/unsloth/models/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteUnslothModel(id: string): Promise<void> {
  await apiFetch(`/unsloth/models/${id}`, { method: 'DELETE' })
}
