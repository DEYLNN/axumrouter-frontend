import { useState } from 'react'
import { API_BASE } from '../api/client'
import { Navigate, useNavigate } from 'react-router-dom'

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Already logged in? redirect
  const token = localStorage.getItem('token')
  if (token) {
    return <Navigate to="/admin" replace />
  }

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const r = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Login failed')
      localStorage.setItem('token', data.token)
      navigate('/admin')
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    if (error) setError('')
  }

  return (
    <div className="min-h-screen bg-[#0B1220] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="border border-white/[0.06] rounded-xl bg-[#0a0f1e]/60 backdrop-blur-xl overflow-hidden"
          style={{ boxShadow: 'inset 0 1px 0 rgba(6,182,212,0.06), 0 0 20px rgba(6,182,212,0.03)' }}>
          <div className="px-6 py-5 border-b border-white/[0.04]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-white tracking-tight">AxumRouter</span>
            </div>
          </div>
          <form onSubmit={login} className="px-6 py-6 space-y-4">
            <div>
              <label className="block text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
              <input type="password" value={password} onChange={handlePasswordChange}
                placeholder="Enter admin password"
                autoFocus
                className="w-full bg-black/50 border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40 transition-all"
                style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }} />
            </div>
            {error && (
              <div className="text-[11px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading || !password}
              className="w-full py-2.5 rounded-lg text-xs font-mono font-bold text-cyan-400 bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 hover:bg-cyan-500/30 disabled:opacity-40 transition-all"
              style={{ boxShadow: '0 0 12px rgba(6,182,212,0.1)' }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
