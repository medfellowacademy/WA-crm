import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrg, adminClient } from '@/lib/org'
import { getPlan } from '@/lib/billing/plans'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { org } = await getCurrentOrg()
    const db = adminClient()

    const periodStart = new Date()
    periodStart.setDate(1)
    periodStart.setHours(0, 0, 0, 0)

    const [usageRes, contactsRes, agentsRes] = await Promise.all([
      db.from('org_usage')
        .select('messages_sent, broadcasts_sent')
        .eq('org_id', org.id)
        .eq('period_start', periodStart.toISOString().split('T')[0])
        .maybeSingle(),
      db.from('contacts').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
      db.from('org_members').select('id', { count: 'exact', head: true })
        .eq('org_id', org.id).not('accepted_at', 'is', null),
    ])

    const planId = (org as Record<string, unknown>).plan as string ?? 'free'
    const limits = getPlan(planId)

    return NextResponse.json({
      plan: planId,
      subscription_status: (org as Record<string, unknown>).subscription_status ?? 'free',
      limits,
      usage: {
        messages:   usageRes.data?.messages_sent   ?? 0,
        broadcasts: usageRes.data?.broadcasts_sent ?? 0,
        contacts:   contactsRes.count ?? 0,
        agents:     agentsRes.count   ?? 0,
      },
    })
  } catch (err) {
    console.error('[billing/usage]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
