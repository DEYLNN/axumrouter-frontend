const API_BASE = import.meta.env.VITE_API_BASE || '/admin/api'

async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: init?.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store',
      'Pragma': 'no-cache',
      ...(init?.headers || {}),
    },
    body: init?.body,
    signal: init?.signal,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export { API_BASE, fetcher }

/** Raw fetch with API_BASE prefix — use instead of bare fetch() for API calls */
export const apiFetch = (url: string, init?: RequestInit) =>
  fetch(`${API_BASE}${url}`, init)

/** Resolve provider icon URL (handles relative paths from backend) */
export function iconUrl(src: string): string {
  if (!src || src.startsWith('http')) return src
  if (API_BASE.startsWith('http')) {
    return new URL(API_BASE).origin + src
  }
  return window.location.origin + src
}
