import { useState, useEffect } from 'react'
import { API_BASE } from '../api/client'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Already logged in? redirect via effect, not render-time Navigate
  useEffect(() => {
    if (localStorage.getItem('token')) {
      navigate('/admin', { replace: true })
    }
  }, [navigate])

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const r = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
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
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="grid-pattern" />
      <div className="w-full max-w-sm relative z-10">
        <div className="brutal-card overflow-hidden">
          <div className="px-6 py-5 border-b-2 border-line">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="NuvCode"
                className="w-8 h-8 rounded-lg border-2 border-line object-cover bg-surface"
              />
              <span className="heading-brutal text-lg uppercase tracking-tight">NuvCode</span>
            </div>
          </div>
          <form onSubmit={login} className="px-6 py-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-subtext uppercase tracking-wider mb-1.5">Username</label>
              <input type="text" value={username} onChange={e => { setUsername(e.target.value); if (error) setError('') }}
                placeholder="Enter username"
                autoFocus
                className="w-full px-4 py-2.5 border-2 border-line rounded-lg font-mono text-sm bg-surface placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff3d81] focus:border-[#ff3d81] transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-subtext uppercase tracking-wider mb-1.5">Password</label>
              <input type="password" value={password} onChange={handlePasswordChange}
                placeholder="Enter admin password"
                className="w-full px-4 py-2.5 border-2 border-line rounded-lg font-mono text-sm bg-surface placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff3d81] focus:border-[#ff3d81] transition-all" />
            </div>
            {error && (
              <div className="text-sm font-bold text-[#ff6b5e] bg-[#ff6b5e]/10 border-2 border-[#ff6b5e] rounded-lg px-4 py-2.5">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading || !password}
              className="brutal-btn w-full bg-[#ff3d81] text-white px-4 py-2.5 text-sm font-bold uppercase tracking-wider disabled:opacity-40">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
