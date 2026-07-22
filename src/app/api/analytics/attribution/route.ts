import { NextResponse } from 'next/server'
import { getCurrentOrg } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/analytics/attribution — Click-to-WhatsApp ad performance.
 * Groups ad referrals by ad (source_id/headline) and joins the revenue
 * from converted conversations (migration 026) to show ad → revenue ROI.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { org } = await getCurrentOrg()

    const { data: referrals } = await supabase
      .from('ctwa_referrals')
      .select('contact_id, conversation_id, source_id, source_url, headline, received_at')
      .eq('org_id', org.id)

    const refs = referrals ?? []
    if (refs.length === 0) {
      return NextResponse.json({ sources: [], totals: { ads: 0, contacts: 0, conversions: 0, revenue: 0 } })
    }

    // Pull conversion data for the conversations these referrals touched.
    const convIds = [...new Set(refs.map((r) => r.conversation_id).filter(Boolean))] as string[]
    const convMap = new Map<string, { converted: boolean; value: number }>()
    if (convIds.length > 0) {
      const { data: convs } = await supabase
        .from('conversations')
        .select('id, converted_at, conversion_value')
        .in('id', convIds)
      for (const c of convs ?? []) {
        convMap.set(c.id, { converted: !!c.converted_at, value: c.conversion_value ?? 0 })
      }
    }

    // Aggregate by ad. Key on source_id when present, else the headline.
    interface Agg {
      source_id: string | null
      headline: string | null
      source_url: string | null
      contacts: Set<string>
      conversions: number
      revenue: number
      clicks: number
    }
    const byAd = new Map<string, Agg>()

    for (const r of refs) {
      const key = r.source_id || r.headline || 'unknown'
      let agg = byAd.get(key)
      if (!agg) {
        agg = {
          source_id: r.source_id ?? null,
          headline: r.headline ?? null,
          source_url: r.source_url ?? null,
          contacts: new Set(),
          conversions: 0,
          revenue: 0,
          clicks: 0,
        }
        byAd.set(key, agg)
      }
      agg.clicks += 1
      if (r.contact_id) agg.contacts.add(r.contact_id)
      const conv = r.conversation_id ? convMap.get(r.conversation_id) : undefined
      if (conv?.converted) {
        agg.conversions += 1
        agg.revenue += conv.value
      }
    }

    const sources = [...byAd.values()]
      .map((a) => ({
        source_id: a.source_id,
        headline: a.headline,
        source_url: a.source_url,
        clicks: a.clicks,
        contacts: a.contacts.size,
        conversions: a.conversions,
        revenue: a.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue || b.contacts - a.contacts)

    const totals = {
      ads: sources.length,
      contacts: new Set(refs.map((r) => r.contact_id)).size,
      conversions: sources.reduce((s, a) => s + a.conversions, 0),
      revenue: sources.reduce((s, a) => s + a.revenue, 0),
    }

    return NextResponse.json({ sources, totals })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
