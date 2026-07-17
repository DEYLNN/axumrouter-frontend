import { useState, useEffect, useRef } from 'react'

import { iconUrl, apiFetch } from '../api'

interface ProviderInfo {
  id: string; name: string; display_name: string; icon_name: string; color: string; oauth_flow: string | null
}

interface OAuthConnectModalProps {
  open: boolean
  provider: ProviderInfo | null
  onClose: () => void
  onSuccess: () => void
}

export default function OAuthConnectModal({ open, provider, onClose, onSuccess }: OAuthConnectModalProps) {
  const [step, setStep] = useState<'loading'|'waiting'|'input'|'success'|'error'>('loading')
  const [authUrl, setAuthUrl] = useState('')
  const [callbackUrl, setCallbackUrl] = useState('')
  const [deviceData, setDeviceData] = useState<any>(null)
  const [error, setError] = useState('')
  const [polling, setPolling] = useState(false)
  const popupRef = useRef<Window | null>(null)
  const pollAbort = useRef(false)
  const processed = useRef(false)
  const onSuccessRef = useRef(onSuccess)
  onSuccessRef.current = onSuccess
  const isDeviceCode = provider?.oauth_flow === 'device_code'

  // Start OAuth flow
  useEffect(() => {
    if (!open || !provider || processed.current) return
    setStep('loading'); setError(''); processed.current = false
    pollAbort.current = false
    ;(async () => {
      try {
        if (isDeviceCode) {
          const r = await apiFetch(`/oauth/${provider.id}/start`)
          const d = await r.json()
          if (!r.ok) throw new Error(d.error || 'Failed')
          if (d.error) throw new Error(d.error)
          setDeviceData(d)
          setStep('waiting')
          setPolling(true)
          const openUrl = d.verification_uri_complete || d.verification_uri || d._loginUrl || d.login_url
          if (openUrl) window.open(openUrl, '_blank', 'noopener,noreferrer')
        } else {
          const r = await apiFetch(`/oauth/${provider.id}/start`)
          const d = await r.json()
          if (!r.ok) throw new Error(d.error || 'Failed')
          setAuthUrl(d.url)
          popupRef.current = window.open(d.url, 'oauth_popup', 'width=600,height=700')
          if (popupRef.current) { setStep('waiting') } else { setStep('input') }
        }
      } catch (e: any) { setError(e.message); setStep('error') }
    })()
  }, [open, provider, isDeviceCode])

  // Poll for device code
  useEffect(() => {
    if (!polling || !deviceData) return
    let cancelled = false
    const poll = async () => {
      for (let i = 0; i < 60; i++) {
        if (cancelled || pollAbort.current) return
        await new Promise(r => setTimeout(r, (deviceData.interval || 5) * 1000))
        if (cancelled || pollAbort.current) return
        try {
          const body: any = { device_code: deviceData.device_code }
          if (deviceData._fingerprintHash) body.fingerprint_hash = deviceData._fingerprintHash
          if (deviceData._expiresAt) body.expires_at = deviceData._expiresAt
          const r = await apiFetch(`/oauth/${provider!.id}/poll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          const d = await r.json()
          if (d.accessToken || d.token || d.success || d.ok || d.access_token) {
            processed.current = true; setStep('success'); setPolling(false); onSuccessRef.current()
            return
          }
          if (d.error === 'expired_token' || d.error === 'access_denied') throw new Error(d.error_description || d.error)
        } catch (e: any) {
          if (!cancelled) { setError(e.message); setStep('error'); setPolling(false) }
          return
        }
      }
      if (!cancelled) { setError('Timeout'); setStep('error'); setPolling(false) }
    }
    poll()
    return () => { cancelled = true; pollAbort.current = true }
  }, [polling, deviceData, provider?.id])

  // Listen for popup callback
  useEffect(() => {
    if (step !== 'waiting' || isDeviceCode) return
    const handler = async (e: MessageEvent) => {
      if (processed.current) return
      const data = e.data?.type === 'oauth_callback' ? e.data.data : e.data
      const code = data?.code || new URLSearchParams(e.data?.url?.split('?')[1] || '').get('code')
      if (!code) return
      processed.current = true
      try {
        const r = await apiFetch(`/oauth/${provider!.id}/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
        if (!r.ok) {
          const err = await r.json().catch(() => ({ error: 'Exchange failed' }))
          throw new Error(err.error || 'Exchange failed')
        }
        setStep('success'); onSuccessRef.current()
      } catch (e: any) { setError(e.message); setStep('error') }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [step, isDeviceCode, provider, provider?.id])

  // Manual submit
  const handleManual = async () => {
    try {
      const raw = callbackUrl.trim()
      if (!raw) throw new Error('No URL/code pasted')

      let code: string | null = null

      // Case 1: full URL → extract ?code=
      if (raw.includes('://') || raw.startsWith('http')) {
        try {
          const u = new URL(raw)
          code = u.searchParams.get('code')
        } catch { /* fall through to raw code */ }
      }

      // Case 2: raw code (user pasted only the code, or ?code=xyz fragment)
      if (!code) {
        const m = raw.match(/[?&]code=([^&\s]+)/)
        code = m ? m[1] : raw
      }

      if (!code) throw new Error('No code found in input')
      setStep('loading')
      // POST /oauth/{id}/exchange returns JSON, not redirect
      const r = await apiFetch(`/oauth/${provider!.id}/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: 'Exchange failed' }))
        throw new Error(err.error || 'Exchange failed')
      }
      setStep('success'); onSuccessRef.current()
    } catch (e: any) { setError(e.message); setStep('error') }
  }

  if (!open || !provider) return null

  const color = provider.color
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md mx-4 rounded-2xl border border-white/[0.06] bg-[#0a0f1e] backdrop-blur-xl p-6"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-5">
          {provider.icon_name && <img src={iconUrl(provider.icon_name)} alt="" className="w-8 h-8 rounded-lg object-contain" style={{ background: `${color}15`, border: `1px solid ${color}25` }} />}
          <div>
            <h2 className="text-sm font-bold text-slate-200">Connect {provider.display_name}</h2>
            <p className="text-[10px] font-mono text-slate-500">{provider.id} — OAuth</p>
          </div>
        </div>

        {step === 'loading' && <div className="text-center py-8 text-sm font-mono text-slate-500 animate-pulse">Starting OAuth flow...</div>}

        {step === 'error' && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] font-mono text-red-400">{error}</div>
            <button onClick={onClose} className="w-full py-2.5 rounded-lg text-xs font-mono font-semibold text-slate-400 bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.15]">Close</button>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
            </div>
            <p className="text-sm font-mono text-slate-300">Connected successfully!</p>
            <button onClick={onClose} className="w-full py-2.5 rounded-lg text-xs font-mono font-semibold text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20">Done</button>
          </div>
        )}

        {step === 'waiting' && !isDeviceCode && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
              <div className="w-4 h-4 border-2 border-cyan-400/40 border-t-cyan-400 rounded-full animate-spin" />
              <span className="text-xs font-mono text-slate-400">Waiting for authorization...</span>
            </div>
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-[9px] font-mono text-slate-600 tracking-wider">OR PASTE URL</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
            <input type="text" value={callbackUrl} onChange={e => setCallbackUrl(e.target.value)}
              placeholder="Paste callback URL here..."
              className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40" />
            <button onClick={handleManual} disabled={!callbackUrl}
              className="w-full py-2.5 rounded-lg text-xs font-mono font-semibold text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 disabled:opacity-30">Connect</button>
          </div>
        )}

        {step === 'input' && !isDeviceCode && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-black/40 border border-white/[0.06]">
              <p className="text-[10px] font-mono text-slate-500 mb-1">Auth URL</p>
              <code className="text-[10px] font-mono text-slate-300 break-all">{authUrl}</code>
            </div>
            <input type="text" value={callbackUrl} onChange={e => setCallbackUrl(e.target.value)}
              placeholder="Paste callback URL here..."
              className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40" />
            <button onClick={handleManual} disabled={!callbackUrl}
              className="w-full py-2.5 rounded-lg text-xs font-mono font-semibold text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 disabled:opacity-30">Connect</button>
          </div>
        )}

        {step === 'waiting' && isDeviceCode && deviceData && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 mx-auto border-2 border-cyan-400/40 border-t-cyan-400 rounded-full animate-spin" />
            <p className="text-sm font-mono text-slate-300">Waiting for device authorization</p>
            <p className="text-[10px] font-mono text-slate-500">Complete authorization in the opened tab, then return here.</p>
            {deviceData.user_code && (
              <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                <p className="text-[9px] font-mono text-slate-500 mb-1">Your code</p>
                <code className="text-lg font-bold tracking-[0.2em] text-cyan-300">{deviceData.user_code}</code>
              </div>
            )}
            {polling && <p className="text-[9px] font-mono text-slate-600 animate-pulse">Polling...</p>}
          </div>
        )}
      </div>
    </div>
  )
}
