'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'wacrm_install_dismissed'

/**
 * Registers the service worker and surfaces a lightweight "Install app"
 * prompt so agents can add WaCRM to their phone home screen. Renders
 * nothing until the browser fires `beforeinstallprompt`.
 */
export function PwaRegister() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    if (typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY) === '1') return

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setVisible(false)
    setDeferred(null)
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0">
      <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 shadow-xl">
        <Download className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">Install WaCRM</p>
          <p className="text-xs text-slate-400">Reply from your phone&apos;s home screen.</p>
        </div>
        <button onClick={install}
          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
          Install
        </button>
        <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 text-slate-500 hover:text-slate-300">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
