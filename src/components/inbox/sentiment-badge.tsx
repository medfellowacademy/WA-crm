'use client'

import type { ConversationSentiment } from '@/types'

const CONFIG: Record<ConversationSentiment, { emoji: string; label: string; className: string }> = {
  positive: {
    emoji: '😊',
    label: 'Positive',
    className: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
  neutral: {
    emoji: '😐',
    label: 'Neutral',
    className: 'bg-slate-500/10 text-slate-400 border-slate-600',
  },
  negative: {
    emoji: '😤',
    label: 'Negative',
    className: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
}

interface Props {
  sentiment: ConversationSentiment | null | undefined
  /** xs = emoji only, sm = emoji + label */
  size?: 'xs' | 'sm'
}

export function SentimentBadge({ sentiment, size = 'sm' }: Props) {
  if (!sentiment) return null
  const cfg = CONFIG[sentiment]
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 font-medium ${
        size === 'xs' ? 'text-[9px]' : 'text-[10px]'
      } ${cfg.className}`}
      title={`Sentiment: ${cfg.label}`}
    >
      <span>{cfg.emoji}</span>
      {size === 'sm' && <span>{cfg.label}</span>}
    </span>
  )
}
