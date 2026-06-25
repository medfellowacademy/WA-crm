import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/org'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: admin } = await adminClient().from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const db = adminClient()
    const [orgsRes, paidRes, messagesRes, todayOrgsRes] = await Promise.all([
      db.from('organizations').select('id', { count: 'exact', head: true }),
      db.from('organizations').select('id', { count: 'exact', head: true }).neq('plan', 'free'),
      db.from('org_usage').select('messages_sent').gte('period_start', new Date(new Date().setDate(1)).toISOString().split('T')[0]),
      db.from('organizations').select('id', { count: 'exact', head: true })
        .gte('created_at', new Date().toISOString().split('T')[0]),
    ])

    const totalMessages = (messagesRes.data ?? []).reduce((s, r) => s + (r.messages_sent ?? 0), 0)

    return NextResponse.json({
      total_orgs:      orgsRes.count    ?? 0,
      paid_orgs:       paidRes.count    ?? 0,
      messages_month:  totalMessages,
      new_today:       todayOrgsRes.count ?? 0,
    })
  } catch (err) {
    console.error('[admin/stats]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
