'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Check, Loader2 } from 'lucide-react'

interface Pack {
  slug: string
  name: string
  emoji: string
  description: string
  stages: number
  quickReplies: number
  appointmentTypes: number
}

interface StarterPackPickerProps {
  /** Called after a pack is successfully applied. */
  onApplied?: (slug: string) => void
  compact?: boolean
}

/**
 * Lets a user pick an industry pack to pre-configure their workspace
 * (pipeline, quick replies, appointment types, tags) in one click.
 */
export function StarterPackPicker({ onApplied, compact }: StarterPackPickerProps) {
  const [packs, setPacks] = useState<Pack[]>([])
  const [applying, setApplying] = useState<string | null>(null)
  const [applied, setApplied] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/onboarding/starter-pack')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setPacks(d.packs) })
      .catch(() => {})
  }, [])

  async function apply(slug: string) {
    setApplying(slug)
    try {
      const res = await fetch('/api/onboarding/starter-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error ?? 'Failed to apply'); return }
      setApplied(slug)
      toast.success('Workspace pre-configured for your industry')
      onApplied?.(slug)
    } finally {
      setApplying(null)
    }
  }

  if (packs.length === 0) return null

  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
      {packs.map((p) => {
        const isApplied = applied === p.slug
        const isBusy = applying === p.slug
        return (
          <button
            key={p.slug}
            type="button"
            disabled={!!applying || !!applied}
            onClick={() => apply(p.slug)}
            className={`group relative rounded-xl border p-3 text-left transition-colors disabled:opacity-60 ${
              isApplied
                ? 'border-primary bg-primary/10'
                : 'border-slate-700 bg-slate-800/50 hover:border-primary/40 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{p.emoji}</span>
              {isApplied
                ? <Check className="h-4 w-4 text-primary" />
                : isBusy
                  ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  : null}
            </div>
            <p className="mt-2 text-sm font-medium text-white">{p.name}</p>
            <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{p.description}</p>
          </button>
        )
      })}
    </div>
  )
}
