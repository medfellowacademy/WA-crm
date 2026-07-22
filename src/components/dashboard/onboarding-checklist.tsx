'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { CheckCircle2, Circle, Loader2, Sparkles, X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Progress {
  steps: { connect_number: boolean; import_contacts: boolean; send_message: boolean }
  done: number
  total: number
  complete: boolean
  contacts: number
}

const DISMISS_KEY = 'wacrm_onboarding_dismissed'

/**
 * Activation checklist — the single most important conversion driver.
 * Three steps to first sent message; collapses once complete or dismissed.
 */
export function OnboardingChecklist() {
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/onboarding/progress')
      if (res.ok) setProgress(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY) === '1') {
      setDismissed(true)
      setLoading(false)
      return
    }
    load()
  }, [load])

  async function loadDemoData() {
    setSeeding(true)
    try {
      const res = await fetch('/api/onboarding/demo-data', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error ?? 'Failed'); return }
      toast.success(d.added > 0 ? `${d.added} demo contacts added` : 'Demo contacts already loaded')
      load()
    } finally {
      setSeeding(false)
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  if (dismissed || loading || !progress || progress.complete) return null

  const steps = [
    {
      key: 'connect_number',
      done: progress.steps.connect_number,
      title: 'Connect your WhatsApp number',
      desc: 'Link a number so you can send and receive messages.',
      href: '/settings?tab=whatsapp',
      cta: 'Connect',
    },
    {
      key: 'import_contacts',
      done: progress.steps.import_contacts,
      title: 'Add your contacts',
      desc: progress.contacts > 0 ? `${progress.contacts} contacts ready.` : 'Import a CSV — or load demo contacts to try it instantly.',
      href: '/contacts',
      cta: 'Import',
      demo: true,
    },
    {
      key: 'send_message',
      done: progress.steps.send_message,
      title: 'Send your first broadcast',
      desc: 'Reach your contacts on WhatsApp in a couple of clicks.',
      href: '/broadcasts/new',
      cta: 'Send',
    },
  ]

  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-slate-900 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold text-white">Get to your first message</h2>
            <p className="text-xs text-slate-400">{progress.done} of {progress.total} done</p>
          </div>
        </div>
        <button onClick={dismiss} aria-label="Dismiss"
          className="text-slate-500 hover:text-slate-300 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${(progress.done / progress.total) * 100}%` }} />
      </div>

      <ul className="mt-4 space-y-2">
        {steps.map((s) => (
          <li key={s.key}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
              s.done ? 'border-slate-800 bg-slate-900/40' : 'border-slate-700 bg-slate-900/70'
            }`}>
            {s.done
              ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
              : <Circle className="h-5 w-5 shrink-0 text-slate-600" />}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${s.done ? 'text-slate-400 line-through' : 'text-white'}`}>
                {s.title}
              </p>
              {!s.done && <p className="text-xs text-slate-500">{s.desc}</p>}
            </div>
            {!s.done && (
              <div className="flex items-center gap-2 shrink-0">
                {s.demo && (
                  <Button size="sm" variant="outline" disabled={seeding} onClick={loadDemoData}
                    className="h-7 border-slate-700 text-slate-300 hover:bg-slate-800 text-xs">
                    {seeding ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Load demo data'}
                  </Button>
                )}
                <Button size="sm" render={<Link href={s.href} />} nativeButton={false}
                  className="h-7 bg-primary text-primary-foreground hover:bg-primary/90 text-xs">
                  {s.cta} <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
