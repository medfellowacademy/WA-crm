import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrg, adminClient } from '@/lib/org'
import { encrypt } from '@/lib/whatsapp/encryption'
import type { WebhookEvent } from '@/lib/integrations/webhooks'

const ALLOWED_EVENTS: WebhookEvent[] = [
  'new_message', 'new_contact', 'conversation_opened',
  'conversation_closed', 'deal_created', 'deal_updated', 'broadcast_sent',
]

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { org } = await getCurrentOrg()

    const { data } = await supabase
      .from('webhook_endpoints')
      .select('id, name, url, events, is_active, last_fired_at, last_status, created_at')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ endpoints: data ?? [] })
  } catch (err) {
    console.error('[integrations/webhooks GET]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { org } = await getCurrentOrg()

    const { name, url, secret, events } = await request.json()
    if (!name || !url) return NextResponse.json({ error: 'name and url are required' }, { status: 400 })
    if (!Array.isArray(events) || events.some(e => !ALLOWED_EVENTS.includes(e))) {
      return NextResponse.json({ error: 'Invalid events' }, { status: 400 })
    }

    const { data, error: insertErr } = await adminClient()
      .from('webhook_endpoints')
      .insert({
        org_id:  org.id,
        user_id: user.id,
        name,
        url,
        secret:  secret ? encrypt(secret) : null,
        events,
      })
      .select()
      .single()

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
    return NextResponse.json({ endpoint: data }, { status: 201 })
  } catch (err) {
    console.error('[integrations/webhooks POST]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
