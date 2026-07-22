'use client'

import { useState, useEffect } from 'react'
import { X, Lightbulb } from 'lucide-react'

interface ModuleHelpBannerProps {
  storageKey: string
  title: string
  children: React.ReactNode
}

/**
 * Dismissible first-time help banner. Persists dismiss state in localStorage
 * so it doesn't reappear after the user closes it.
 */
export function ModuleHelpBanner({ storageKey, title, children }: ModuleHelpBannerProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show if user hasn't dismissed it before
    const dismissed = localStorage.getItem(storageKey)
    if (!dismissed) setVisible(true)
  }, [storageKey])

  function dismiss() {
    localStorage.setItem(storageKey, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        <div className="mt-1 text-xs leading-relaxed text-slate-400 space-y-1">
          {children}
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 text-slate-500 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
