import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTemplateMessage } from '@/lib/whatsapp/meta-api'
import { decrypt } from '@/lib/whatsapp/encryption'
import {
  sanitizePhoneForMeta,
  isValidE164,
  phoneVariants,
  isRecipientNotAllowedError,
} from '@/lib/whatsapp/phone-utils'

// How many recipients to send per server invocation.
// Keep low enough to fit within Vercel's 60s function timeout.
const BATCH_SIZE = 50
// Meta allows ~80 messages/sec per phone number. 50 recipients with
// no delay per batch stays well under that ceiling.

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Resolve per-contact template params from stored variable mappings.
 * Mirrors the browser-side resolveVariables but runs server-side.
 */
function resolveParams(
  variables: Record<string, { type: string; value: string }> | null,
  contact: Record<string, string | null>,
  customValues: Map<string, string>,
): string[] {
  if (!variables) return []
  const keys = Object.keys(variables).sort((a, b) => {
    const an = Number(a), bn = Number(b)
    if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn
    return a.localeCompare(b)
  })
  return keys.map((key) => {
    const v = variables[key]
    if (v.type === 'static') return v.value
    if (v.type === 'field') {
      const map: Record<string, string | null | undefined> = {
        name: contact.name, phone: contact.phone,
        email: contact.email, company: contact.company,
      }
      return map[v.value] ?? ''
    }
    // custom_field
    return customValues.get(v.value) ?? ''
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify the request is from our own cron or internal caller
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: broadcastId } = await params
  const db = supabaseAdmin()

  // Lock the broadcast for processing — set status to 'sending' and
  // record when we started. The cron uses processing_started_at to
  // detect stalled jobs and restart them after 10 minutes.
  const { data: broadcast, error: lockErr } = await db
    .from('broadcasts')
    .update({
      status: 'sending',
      processing_started_at: new Date().toISOString(),
    })
    .eq('id', broadcastId)
    .in('status', ['queued', 'sending'])
    .select()
    .maybeSingle()

  if (lockErr || !broadcast) {
    // Already completed or doesn't exist — skip silently
    return NextResponse.json({ skipped: true })
  }

  // Fetch WhatsApp config for this user
  const { data: config, error: configErr } = await db
    .from('whatsapp_config')
    .select('*')
    .eq('user_id', broadcast.user_id)
    .single()

  if (configErr || !config) {
    await db.from('broadcasts').update({ status: 'failed' }).eq('id', broadcastId)
    return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 400 })
  }

  const accessToken = decrypt(config.access_token)

  // Fetch a batch of pending recipients with their contact data
  const { data: recipients, error: recipientsErr } = await db
    .from('broadcast_recipients')
    .select('*, contact:contacts(*)')
    .eq('broadcast_id', broadcastId)
    .eq('status', 'pending')
    .limit(BATCH_SIZE)

  if (recipientsErr || !recipients) {
    return NextResponse.json({ error: 'Failed to fetch recipients' }, { status: 500 })
  }

  if (recipients.length === 0) {
    // All recipients processed — finalize
    const { data: counts } = await db
      .from('broadcasts')
      .select('total_recipients, failed_count')
      .eq('id', broadcastId)
      .single()

    const finalStatus =
      counts && counts.failed_count >= counts.total_recipients ? 'failed' : 'sent'

    await db
      .from('broadcasts')
      .update({ status: finalStatus, processing_started_at: null })
      .eq('id', broadcastId)

    return NextResponse.json({ done: true, status: finalStatus })
  }

  // Preload custom values for this batch
  const contactIds = recipients
    .map((r) => r.contact?.id)
    .filter((id): id is string => Boolean(id))

  const customValueIndex = new Map<string, Map<string, string>>()
  if (contactIds.length > 0) {
    const { data: customValues } = await db
      .from('contact_custom_values')
      .select('contact_id, custom_field_id, value')
      .in('contact_id', contactIds)

    for (const row of customValues ?? []) {
      const bucket = customValueIndex.get(row.contact_id) ?? new Map<string, string>()
      bucket.set(row.custom_field_id, row.value ?? '')
      customValueIndex.set(row.contact_id, bucket)
    }
  }

  // Send each recipient
  const variables = broadcast.template_variables as Record<
    string,
    { type: string; value: string }
  > | null

  let sentCount = 0
  let failedCount = 0

  for (const recipient of recipients) {
    const contact = recipient.contact
    if (!contact?.phone) {
      await db
        .from('broadcast_recipients')
        .update({ status: 'failed', error_message: 'No phone on contact' })
        .eq('id', recipient.id)
      failedCount++
      continue
    }

    const sanitized = sanitizePhoneForMeta(contact.phone)
    if (!isValidE164(sanitized)) {
      await db
        .from('broadcast_recipients')
        .update({ status: 'failed', error_message: 'Invalid phone format' })
        .eq('id', recipient.id)
      failedCount++
      continue
    }

    const params = resolveParams(
      variables,
      contact,
      customValueIndex.get(contact.id) ?? new Map(),
    )

    const variants = phoneVariants(sanitized)
    let messageId: string | null = null
    let lastError: string | null = null

    for (const variant of variants) {
      try {
        const result = await sendTemplateMessage({
          phoneNumberId: config.phone_number_id,
          accessToken,
          to: variant,
          templateName: broadcast.template_name,
          language: broadcast.template_language ?? 'en_US',
          params,
        })
        messageId = result.messageId
        lastError = null
        break
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (!isRecipientNotAllowedError(msg)) { lastError = msg; break }
        lastError = msg
      }
    }

    if (messageId) {
      await db
        .from('broadcast_recipients')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          whatsapp_message_id: messageId,
          error_message: null,
        })
        .eq('id', recipient.id)
      sentCount++
    } else {
      await db
        .from('broadcast_recipients')
        .update({ status: 'failed', error_message: lastError ?? 'Unknown error' })
        .eq('id', recipient.id)
      failedCount++
    }
  }

  // Check if there are more pending recipients
  const { count: remaining } = await db
    .from('broadcast_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('broadcast_id', broadcastId)
    .eq('status', 'pending')

  return NextResponse.json({
    done: (remaining ?? 0) === 0,
    sent: sentCount,
    failed: failedCount,
    remaining: remaining ?? 0,
  })
}
