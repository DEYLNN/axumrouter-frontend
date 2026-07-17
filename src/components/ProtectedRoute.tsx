import { getToken } from '../api/client'
import { useState, useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'

export default function ProtectedRoute() {
  const [checking, setChecking] = useState(true)
  const [valid, setValid] = useState(false)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setValid(false)
      setChecking(false)
      return
    }

    // Verify token expiry client-side (JWT payload is base64)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const exp = payload.exp * 1000
      if (Date.now() >= exp) {
        localStorage.removeItem('token')
        setValid(false)
      } else {
        setValid(true)
      }
    } catch {
      // If can't parse, assume valid — backend will reject
      setValid(true)
    }
    setChecking(false)
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0B1220] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (!valid) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
