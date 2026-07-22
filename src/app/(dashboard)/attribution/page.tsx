'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Users, Target, DollarSign, Megaphone, ExternalLink } from 'lucide-react'

interface AdSource {
  source_id: string | null
  headline: string | null
  source_url: string | null
  clicks: number
  contacts: number
  conversions: number
  revenue: number
}
interface AttributionData {
  sources: AdSource[]
  totals: { ads: number; contacts: number; conversions: number; revenue: number }
}

function money(v: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v)
}

export default function AttributionPage() {
  const [data, setData] = useState<AttributionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics/attribution')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const stats = [
    { label: 'Ad-sourced contacts', value: data?.totals.contacts ?? 0, icon: Users },
    { label: 'Active ads', value: data?.totals.ads ?? 0, icon: Megaphone },
    { label: 'Conversions', value: data?.totals.conversions ?? 0, icon: Target },
    { label: 'Revenue from ads', value: money(data?.totals.revenue ?? 0), icon: DollarSign },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Ad Attribution</h1>
        <p className="mt-1 text-sm text-slate-400">
          Click-to-WhatsApp ad performance — from first message to closed revenue.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center gap-2 text-slate-400">
              <s.icon className="h-4 w-4" />
              <span className="text-xs">{s.label}</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {loading ? '—' : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Per-ad table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-white">Performance by ad</h2>
        </div>

        {loading ? (
          <div className="p-5 space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-slate-800/60 animate-pulse" />)}
          </div>
        ) : !data || data.sources.length === 0 ? (
          <div className="p-10 text-center">
            <Megaphone className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-3 text-sm font-medium text-slate-400">No ad-attributed conversations yet</p>
            <p className="mt-1 text-xs text-slate-500">
              When customers message you from a Click-to-WhatsApp ad, they&apos;ll appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                  <th className="px-5 py-2 font-medium">Ad</th>
                  <th className="px-3 py-2 font-medium text-right">Clicks</th>
                  <th className="px-3 py-2 font-medium text-right">Contacts</th>
                  <th className="px-3 py-2 font-medium text-right">Conversions</th>
                  <th className="px-5 py-2 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.sources.map((s, i) => (
                  <tr key={s.source_id ?? i} className="border-b border-slate-800/60 last:border-0">
                    <td className="px-5 py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate max-w-xs">
                          {s.headline || s.source_id || 'Unknown ad'}
                        </p>
                        {s.source_url && (
                          <a href={s.source_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline">
                            {s.source_id ? `Ad ${s.source_id}` : 'View'} <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-300">{s.clicks}</td>
                    <td className="px-3 py-3 text-right text-slate-300">{s.contacts}</td>
                    <td className="px-3 py-3 text-right text-slate-300">{s.conversions}</td>
                    <td className="px-5 py-3 text-right font-semibold text-green-400">{money(s.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
