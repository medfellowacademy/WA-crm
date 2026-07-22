'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Minimal shape of the Facebook JS SDK surface we use.
interface FBLoginResponse {
  authResponse?: { code?: string } | null
  status?: string
}
interface FacebookSDK {
  init(opts: { appId: string; autoLogAppEvents?: boolean; xfbml?: boolean; version: string }): void
  login(
    cb: (resp: FBLoginResponse) => void,
    opts: {
      config_id: string
      response_type: 'code'
      override_default_response_type: boolean
      extras: { setup: Record<string, unknown>; featureType?: string; sessionInfoVersion: string }
    },
  ): void
}
declare global {
  interface Window {
    FB?: FacebookSDK
    fbAsyncInit?: () => void
  }
}

const APP_ID = process.env.NEXT_PUBLIC_META_APP_ID
const CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID
const GRAPH_VERSION = 'v21.0'

interface EmbeddedSignupButtonProps {
  /** Fired after a number is successfully connected. */
  onConnected?: () => void
  className?: string
}

export function EmbeddedSignupButton({ onConnected, className }: EmbeddedSignupButtonProps) {
  const [sdkReady, setSdkReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // The popup reports waba_id / phone_number_id via postMessage; the
  // FB.login callback returns the auth code. We need both, and they can
  // arrive in either order, so stash the session info in a ref.
  const sessionInfo = useRef<{ waba_id?: string; phone_number_id?: string }>({})

  const configured = Boolean(APP_ID && CONFIG_ID)

  // Load the Facebook SDK once.
  useEffect(() => {
    if (!configured) return
    if (window.FB) { setSdkReady(true); return }

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: APP_ID!,
        autoLogAppEvents: true,
        xfbml: false,
        version: GRAPH_VERSION,
      })
      setSdkReady(true)
    }

    const id = 'facebook-jssdk'
    if (!document.getElementById(id)) {
      const script = document.createElement('script')
      script.id = id
      script.src = 'https://connect.facebook.net/en_US/sdk.js'
      script.async = true
      script.defer = true
      script.crossOrigin = 'anonymous'
      document.body.appendChild(script)
    }
  }, [configured])

  // Capture the WABA + phone number Meta posts back from the popup.
  useEffect(() => {
    if (!configured) return
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') {
        return
      }
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
        if (data?.type === 'WA_EMBEDDED_SIGNUP' && data.event === 'FINISH') {
          sessionInfo.current = {
            waba_id: data.data?.waba_id,
            phone_number_id: data.data?.phone_number_id,
          }
        }
      } catch {
        // Non-JSON postMessage from the SDK — ignore.
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [configured])

  const finish = useCallback(
    async (code: string) => {
      const { waba_id, phone_number_id } = sessionInfo.current
      if (!waba_id || !phone_number_id) {
        toast.error('Signup did not return a WhatsApp number. Please try again.')
        return
      }
      setSubmitting(true)
      try {
        const res = await fetch('/api/whatsapp/embedded-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, waba_id, phone_number_id }),
        })
        const d = await res.json()
        if (!res.ok) {
          toast.error(d.error ?? 'Failed to connect WhatsApp')
          return
        }
        toast.success(`Connected ${d.display_phone || d.verified_name || 'WhatsApp number'}`)
        sessionInfo.current = {}
        onConnected?.()
      } catch {
        toast.error('Failed to connect WhatsApp')
      } finally {
        setSubmitting(false)
      }
    },
    [onConnected],
  )

  const launch = useCallback(() => {
    if (!window.FB) return
    window.FB.login(
      (resp) => {
        const code = resp.authResponse?.code
        if (code) {
          void finish(code)
        } else {
          // User closed the popup or denied — no toast needed for a cancel.
        }
      },
      {
        config_id: CONFIG_ID!,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, featureType: '', sessionInfoVersion: '3' },
      },
    )
  }, [finish])

  if (!configured) {
    return (
      <p className="text-xs text-slate-500">
        Embedded Signup isn&apos;t configured. Set{' '}
        <code className="text-slate-400">NEXT_PUBLIC_META_APP_ID</code> and{' '}
        <code className="text-slate-400">NEXT_PUBLIC_META_CONFIG_ID</code> to enable one-click WhatsApp connect.
      </p>
    )
  }

  return (
    <Button
      onClick={launch}
      disabled={!sdkReady || submitting}
      className={className}
    >
      {submitting ? (
        <><Loader2 className="size-4 animate-spin" /> Connecting…</>
      ) : (
        <><MessageCircle className="size-4" /> Connect WhatsApp</>
      )}
    </Button>
  )
}
