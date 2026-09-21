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
  const [oauthState, setOauthState] = useState('')
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
          setOauthState(d.id || new URL(d.url).searchParams.get('state') || '')
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
      const callback = e.data?.url ? new URL(e.data.url) : null
      const code = data?.code || callback?.searchParams.get('code')
      const state = data?.state || callback?.searchParams.get('state') || oauthState
      if (!code) return
      processed.current = true
      try {
        const r = await apiFetch(`/oauth/${provider!.id}/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state }),
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
  }, [step, isDeviceCode, provider, provider?.id, oauthState])

  // Manual submit
  const handleManual = async () => {
    try {
      const raw = callbackUrl.trim()
      if (!raw) throw new Error('No URL/code pasted')

      let code: string | null = null
      let state = oauthState

      // Case 1: full URL → extract ?code=
      if (raw.includes('://') || raw.startsWith('http')) {
        try {
          const u = new URL(raw)
          code = u.searchParams.get('code')
          state = u.searchParams.get('state') || oauthState
          setOauthState(state)
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
        body: JSON.stringify({ code, state }),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="brutal-card w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-5 border-b-2 border-line pb-4">
          {provider.icon_name && <img src={iconUrl(provider.icon_name)} alt="" className="w-8 h-8 rounded-lg object-contain border-2 border-line" style={{ background: `${color}15` }} />}
          <div>
            <h2 className="heading-brutal text-sm uppercase">Connect {provider.display_name}</h2>
            <p className="mono-brutal text-[10px] text-subtext">{provider.id} — OAuth</p>
          </div>
        </div>

        {step === 'loading' && <div className="text-center py-8 mono-brutal text-sm text-subtext animate-pulse">Starting OAuth flow...</div>}

        {step === 'error' && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-[#ff6b5e]/10 border-2 border-[#ff6b5e] text-[11px] mono-brutal text-danger-text">{error}</div>
            <button onClick={onClose} className="brutal-btn w-full py-2.5 text-xs mono-brutal font-semibold text-white bg-[#ff6b5e] hover:bg-[#ff6b5e]/80">Close</button>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#3ddc97]/10 border-2 border-[#3ddc97] flex items-center justify-center">
              <svg className="w-6 h-6 text-success-text" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
            </div>
            <p className="mono-brutal text-sm text-ink">Connected successfully!</p>
            <button onClick={onClose} className="brutal-btn w-full py-2.5 text-xs mono-brutal font-semibold text-on-accent bg-[#3ddc97] hover:bg-[#3ddc97]/80">Done</button>
          </div>
        )}

        {step === 'waiting' && !isDeviceCode && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#c8a2ff]/10 border-2 border-[#c8a2ff]">
              <div className="w-4 h-4 border-2 border-[#c8a2ff]/40 border-t-[#c8a2ff] rounded-full animate-spin" />
              <span className="mono-brutal text-xs text-ink">Waiting for authorization...</span>
            </div>
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-line/10" />
              <span className="mono-brutal text-[9px] text-subtext tracking-wider">OR PASTE URL</span>
              <div className="flex-1 h-px bg-line/10" />
            </div>
            <input type="text" value={callbackUrl} onChange={e => setCallbackUrl(e.target.value)}
              placeholder="Paste callback URL here..."
              className="w-full bg-surface border-2 border-line rounded-lg px-3 py-2 text-xs mono-brutal text-ink placeholder:text-subtext/70 focus:outline-none focus:border-[#c8a2ff]" />
            <button onClick={handleManual} disabled={!callbackUrl}
              className="brutal-btn w-full py-2.5 text-xs mono-brutal font-semibold text-white bg-[#ff3d81] hover:bg-[#ff3d81]/80 disabled:opacity-30">Connect</button>
          </div>
        )}

        {step === 'input' && !isDeviceCode && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted border-2 border-line">
              <p className="mono-brutal text-[10px] text-subtext mb-1">Auth URL</p>
              <code className="mono-brutal text-[10px] text-ink break-all">{authUrl}</code>
            </div>
            <input type="text" value={callbackUrl} onChange={e => setCallbackUrl(e.target.value)}
              placeholder="Paste callback URL here..."
              className="w-full bg-surface border-2 border-line rounded-lg px-3 py-2 text-xs mono-brutal text-ink placeholder:text-subtext/70 focus:outline-none focus:border-[#c8a2ff]" />
            <button onClick={handleManual} disabled={!callbackUrl}
              className="brutal-btn w-full py-2.5 text-xs mono-brutal font-semibold text-white bg-[#ff3d81] hover:bg-[#ff3d81]/80 disabled:opacity-30">Connect</button>
          </div>
        )}

        {step === 'waiting' && isDeviceCode && deviceData && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 mx-auto border-2 border-[#c8a2ff]/40 border-t-[#c8a2ff] rounded-full animate-spin" />
            <p className="mono-brutal text-sm text-ink">Waiting for device authorization</p>
            <p className="mono-brutal text-[10px] text-subtext">Complete authorization in the opened tab, then return here.</p>
            {deviceData.user_code && (
              <div className="p-3 rounded-lg bg-[#c8a2ff]/10 border-2 border-[#c8a2ff]">
                <p className="mono-brutal text-[9px] text-subtext mb-1">Your code</p>
                <code className="mono-brutal text-lg font-bold tracking-[0.2em] text-accent-text">{deviceData.user_code}</code>
              </div>
            )}
            {polling && <p className="mono-brutal text-[9px] text-subtext animate-pulse">Polling...</p>}
          </div>
        )}
      </div>
    </div>
  )
}
