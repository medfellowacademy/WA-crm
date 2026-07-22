import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrg } from '@/lib/org'

/**
 * GET /api/onboarding/progress — the three steps to first sent message.
 * Drives the dashboard activation checklist. Optimizing TTFSM = getting
 * `send_message` to true as fast as possible.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { org, userId } = await getCurrentOrg()

    // 1. A WhatsApp number connected (new multi-number table OR legacy config).
    const [{ count: numbersCount }, { count: legacyConfig }] = await Promise.all([
      supabase.from('whatsapp_numbers').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
      supabase.from('whatsapp_config').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    ])
    const connectNumber = (numbersCount ?? 0) > 0 || (legacyConfig ?? 0) > 0

    // 2. At least one contact.
    const { count: contactsCount } = await supabase
      .from('contacts').select('id', { count: 'exact', head: true }).eq('org_id', org.id)
    const importContacts = (contactsCount ?? 0) > 0

    // 3. First sent message — any outbound message, or a broadcast under way.
    const [{ count: outboundCount }, { count: broadcastCount }] = await Promise.all([
      supabase
        .from('messages')
        .select('id, conversations!inner(org_id)', { count: 'exact', head: true })
        .in('sender_type', ['agent', 'bot'])
        .eq('conversations.org_id', org.id),
      supabase
        .from('broadcasts')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .in('status', ['sending', 'sent']),
    ])
    const sendMessage = (outboundCount ?? 0) > 0 || (broadcastCount ?? 0) > 0

    const steps = { connect_number: connectNumber, import_contacts: importContacts, send_message: sendMessage }
    const done = Object.values(steps).filter(Boolean).length

    return NextResponse.json({
      steps,
      done,
      total: 3,
      complete: done === 3,
      contacts: contactsCount ?? 0,
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
