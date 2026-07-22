'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'
import { MARKET_RATES, estimateBroadcastCost, formatUsd, type TemplateCategory } from '@/lib/billing/meta-pricing'

interface CostEstimateProps {
  recipients: number
  category: TemplateCategory
}

/**
 * Shows the estimated Meta message cost before sending a broadcast. Lets
 * the user pick their primary market since rates vary widely by country.
 */
export function CostEstimate({ recipients, category }: CostEstimateProps) {
  const [market, setMarket] = useState('OTHER')
  const { perMessage, total } = estimateBroadcastCost(recipients, market, category)

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">Estimated Meta cost</p>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
          {category}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-400">Market</label>
        <select
          value={market}
          onChange={(e) => setMarket(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white focus:outline-none focus:border-primary/50"
        >
          {MARKET_RATES.map((m) => (
            <option key={m.code} value={m.code}>{m.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-white">{formatUsd(total)}</p>
          <p className="text-xs text-slate-500">
            {recipients.toLocaleString()} × {formatUsd(perMessage)} / message
          </p>
        </div>
      </div>

      <p className="flex items-start gap-1.5 text-[11px] text-slate-500">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        Estimate only. Meta bills per delivered message; rates vary by country and change over time. Customer-initiated (service) replies are free.
      </p>
    </div>
  )
}
