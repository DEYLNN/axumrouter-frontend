import { useState, useRef, useCallback } from 'react'
import { startOAuth, exchangeOAuth } from '../api'
import { apiFetch } from '../api'

interface UseOAuthFlowReturn {
  showModal: boolean
  oauthUrl: string
  oauthCode: string
  oauthConnecting: boolean
  oauthError: string
  oauthDone: boolean
  isDeviceCode: boolean
  polling: boolean
  setShowModal: (v: boolean) => void
  setOauthCode: (v: string) => void
  setOauthDone: (v: boolean) => void
  open: () => Promise<void>
  exchange: () => Promise<void>
}

export function useOAuthFlow(providerId: string, onSuccess: () => void): UseOAuthFlowReturn {
  const [showModal, setShowModal] = useState(false)
  const [oauthUrl, setOauthUrl] = useState('')
  const [oauthSession, setOauthSession] = useState('')
  const [oauthCode, setOauthCode] = useState('')
  const [oauthConnecting, setOauthConnecting] = useState(false)
  const [oauthError, setOauthError] = useState('')
  const [oauthDone, setOauthDone] = useState(false)
  const [isDeviceCode, setIsDeviceCode] = useState(false)
  const [polling, setPolling] = useState(false)
  const pollRef = useRef(false)

  const devicePoll = useCallback((data: any) => {
    const id = providerId
    const interval = (data.interval || 4) * 1000
    let attempts = 0
    const maxAttempts = Math.floor(600 / (data.interval || 4))

    const tick = async () => {
      if (!pollRef.current || attempts >= maxAttempts) {
        setPolling(false)
        if (attempts >= maxAttempts) setOauthError('Authorization timeout')
        return
      }
      attempts++
      try {
        const isNp = id === 'np'
        const body = isNp
          ? JSON.stringify({ device_code: data.device_code })
          : JSON.stringify({
              device_code: data.device_code,
              fingerprint_hash: data.fingerprint_hash || null,
              expires_at: data.expires_at || null,
            })
        const res = await apiFetch(`/admin/oauth/${id}/poll`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
        })
        if (!res.ok) { setTimeout(tick, interval); return }
        const result = await res.json()
        if (!pollRef.current) return
        const success = isNp ? (result.success && result.accessToken) : (result.ok && result.access_token)
        if (success) {
          pollRef.current = false; setPolling(false); setOauthDone(true)
          onSuccess(); return
        }
        if (result.error === 'expired_token' || result.error === 'access_denied') {
          pollRef.current = false; setPolling(false)
          setOauthError('Link expired or already used. Close and try again.'); return
        }
        setTimeout(tick, interval)
      } catch {
        if (!pollRef.current) return
        setTimeout(tick, interval)
      }
    }
    tick()
  }, [providerId, onSuccess])

  const open = useCallback(async () => {
    setOauthError(''); setOauthDone(false); setOauthCode('')
    setOauthConnecting(true); setIsDeviceCode(false)
    try {
      if (providerId === 'fb' || providerId === 'np') {
        setIsDeviceCode(true)
        const res = await apiFetch(`/admin/oauth/${providerId}/start`)
        if (!res.ok) throw new Error('OAuth start failed: ' + res.status)
        const data = await res.json()
        setOauthUrl(data.verification_uri_complete || data.login_url || '')
        setShowModal(true)
        window.open(data.verification_uri_complete || data.login_url, '_blank', 'noopener,noreferrer')
        pollRef.current = true; setPolling(true)
        devicePoll(data)
      } else {
        const result = await startOAuth(providerId)
        setOauthUrl(result.url); setOauthSession(result.id)
        setShowModal(true)
      }
    } catch (e: any) { setOauthError(e.message) }
    setOauthConnecting(false)
  }, [providerId, devicePoll])

  const exchange = useCallback(async () => {
    if (!oauthCode.trim()) return
    setOauthConnecting(true); setOauthError('')
    try {
      const result = await exchangeOAuth(providerId, oauthSession, oauthCode.trim())
      if (result.success) { setOauthDone(true); onSuccess() }
      else { setOauthError(result.error || 'Exchange failed') }
    } catch (e: any) { setOauthError(e.message) }
    setOauthConnecting(false)
  }, [providerId, oauthCode, oauthSession, onSuccess])

  return {
    showModal, oauthUrl, oauthCode, oauthConnecting, oauthError, oauthDone,
    isDeviceCode, polling,
    setShowModal, setOauthCode, setOauthDone,
    open, exchange,
  }
}
