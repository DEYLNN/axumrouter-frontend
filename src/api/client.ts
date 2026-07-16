const API_BASE = import.meta.env.VITE_API_BASE || '/admin/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store',
    'Pragma': 'no-cache',
    ...(init?.headers as Record<string, string> || {}),
  }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${url}`, {
    method: init?.method || 'GET',
    headers,
    body: init?.body,
    signal: init?.signal,
  })
  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export { API_BASE, fetcher, getToken }

/** Raw fetch with API_BASE prefix + auth header — use instead of bare fetch() for API calls */
export const apiFetch = (url: string, init?: RequestInit) => {
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> || {}),
  }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  return fetch(`${API_BASE}${url}`, { ...init, headers }).then(res => {
    if (res.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return res
  })
}

/** Resolve provider icon URL from icon_name */
export function iconUrl(name: string): string {
  if (!name) return ''
  if (name.startsWith('http')) return name
  // Dev: Vite serves /providers/ from FE public/
  // Prod: BE serves /admin/providers/ from FE build (copied to public/admin/providers/)
  const base = import.meta.env.DEV ? '' : '/admin'
  return base + '/providers/' + name
}
