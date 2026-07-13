export async function startOAuth(provider: string): Promise<{ id: string; url: string }> {
  const res = await apiFetch(`/admin/oauth/${provider}/start`)
  if (!res.ok) throw new Error(`OAuth start failed: ${res.status}`)
  return res.json()
}

export async function exchangeOAuth(provider: string, id: string, code: string): Promise<{ success: boolean; error?: string }> {
  const res = await apiFetch(`/admin/oauth/${provider}/exchange`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, code }),
  })
  if (!res.ok) throw new Error(`OAuth exchange failed: ${res.status}`)
  return res.json()
}
