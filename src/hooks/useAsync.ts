import { useState, useEffect, useCallback } from 'react'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAsync<T>(
  fetcher: () => Promise<T>,
  deps: any[] = [],
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const exec = useCallback(() => {
    setLoading(true)
    setError(null)
    fetcher()
      .then(setData)
      .catch(e => setError(e?.message || 'Unknown error'))
      .finally(() => setLoading(false))
  }, deps)

  useEffect(() => { exec() }, [exec])

  return { data, loading, error, refetch: exec }
}
