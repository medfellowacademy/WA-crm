'use client'

import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'

interface HelpTooltipProps {
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

/**
 * Inline "?" button that reveals a help popover on click.
 * Pure CSS + React state — no external tooltip lib needed.
 */
export function HelpTooltip({ children, side = 'bottom', className }: HelpTooltipProps) {
  const [open, setOpen] = useState(false)

  const positionClasses: Record<typeof side, string> = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left:   'right-full top-1/2 -translate-y-1/2 mr-2',
    right:  'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <span className={`relative inline-flex items-center ${className ?? ''}`}>
      <button
        type="button"
        aria-label="Help"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        className="flex h-4 w-4 items-center justify-center rounded-full text-slate-500 hover:text-slate-300 transition-colors"
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      {open && (
        <>
          {/* Backdrop — close on outside click */}
          <span
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <span className={`absolute z-50 w-64 rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl ${positionClasses[side]}`}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-2 top-2 text-slate-500 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="pr-4 text-xs leading-relaxed text-slate-300">
              {children}
            </div>
          </span>
        </>
      )}
    </span>
  )
}
