import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * SLA Check Cron — runs every 5 minutes via Vercel cron or external scheduler.
 * Detects conversations that breached their SLA, records an alert, and
 * optionally auto-escalates (adds internal note).
 *
 * Two SLA types:
 *   first_response — open conversations with no agent reply within X minutes
 *   resolution     — any non-closed conversation open longer than Y hours
 *
 * SLA settings live on organizations.sla_settings JSONB:
 *   { "first_response_minutes": 60, "resolution_hours": 24 }
 */

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = supabaseAdmin()
  const now = new Date()
  let alertsCreated = 0
  let alertsResolved = 0

  // Fetch all orgs that have SLA settings configured
  const { data: orgs, error: orgsErr } = await db
    .from('organizations')
    .select('id, sla_settings')
    .not('sla_settings', 'is', null)

  if (orgsErr || !orgs?.length) {
    return NextResponse.json({ processed: 0 })
  }

  for (const org of orgs) {
    const sla = org.sla_settings as { first_response_minutes?: number; resolution_hours?: number } | null
    if (!sla) continue

    const firstResponseMin = sla.first_response_minutes ?? 60
    const resolutionHours  = sla.resolution_hours ?? 24

    // ── First-response SLA ──────────────────────────────────────────────
    // Open conversations with no outbound agent message yet, idle > threshold
    const frCutoff = new Date(now.getTime() - firstResponseMin * 60 * 1000).toISOString()
    const { data: frBreaches } = await db
      .from('conversations')
      .select('id, assigned_agent_id, created_at')
      .eq('org_id', org.id)
      .eq('status', 'open')
      .lt('created_at', frCutoff)

    for (const conv of frBreaches ?? []) {
      // Check if agent has already replied
      const { count: agentMsgCount } = await db
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('sender_type', 'agent')
        .eq('is_internal', false)

      if ((agentMsgCount ?? 0) > 0) {
        // Agent has replied — resolve any existing alert
        const { data: existing } = await db
          .from('sla_alerts')
          .select('id')
          .eq('conversation_id', conv.id)
          .eq('alert_type', 'first_response')
          .eq('is_active', true)
          .maybeSingle()

        if (existing) {
          await db
            .from('sla_alerts')
            .update({ is_active: false, resolved_at: now.toISOString() })
            .eq('id', existing.id)
          alertsResolved++
        }
        continue
      }

      // Upsert alert (ignores conflict if already exists)
      const { error: upsertErr } = await db
        .from('sla_alerts')
        .upsert(
          {
            org_id: org.id,
            conversation_id: conv.id,
            alert_type: 'first_response',
            breached_at: now.toISOString(),
            is_active: true,
          },
          { onConflict: 'conversation_id,alert_type', ignoreDuplicates: true }
        )

      if (!upsertErr) {
        alertsCreated++
        // Add escalation note so agents see it in the thread
        await db.from('messages').insert({
          conversation_id: conv.id,
          org_id: org.id,
          sender_type: 'system',
          content_type: 'text',
          content_text: `⚠️ SLA breach: No first response within ${firstResponseMin} minutes.`,
          is_internal: true,
          status: 'delivered',
        })
      }
    }

    // ── Resolution SLA ──────────────────────────────────────────────────
    // Non-closed conversations open longer than resolution threshold
    const resCutoff = new Date(now.getTime() - resolutionHours * 60 * 60 * 1000).toISOString()
    const { data: resBreaches } = await db
      .from('conversations')
      .select('id, assigned_agent_id')
      .eq('org_id', org.id)
      .neq('status', 'closed')
      .lt('created_at', resCutoff)

    for (const conv of resBreaches ?? []) {
      const { error: upsertErr } = await db
        .from('sla_alerts')
        .upsert(
          {
            org_id: org.id,
            conversation_id: conv.id,
            alert_type: 'resolution',
            breached_at: now.toISOString(),
            is_active: true,
          },
          { onConflict: 'conversation_id,alert_type', ignoreDuplicates: true }
        )

      if (!upsertErr) {
        alertsCreated++
        await db.from('messages').insert({
          conversation_id: conv.id,
          org_id: org.id,
          sender_type: 'system',
          content_type: 'text',
          content_text: `⚠️ SLA breach: Conversation unresolved for ${resolutionHours} hours.`,
          is_internal: true,
          status: 'delivered',
        })
      }
    }
  }

  return NextResponse.json({ alertsCreated, alertsResolved })
}
