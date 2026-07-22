import { adminClient } from '@/lib/org'
import { authenticateApiKey, apiUnauthorized, canWrite } from '@/lib/api/auth'
import { normalizePhone } from '@/lib/whatsapp/phone-utils'
import { engineSendText } from '@/lib/flows/meta-send'

/**
 * POST /api/v1/messages — send a WhatsApp text message.
 * Body: { phone (required), text (required) }
 *
 * The headline integration action ("when X happens in Shopify, send a
 * WhatsApp message"). Resolves/creates the contact + conversation, then
 * sends through the org owner's WhatsApp config via the canonical sender
 * (same phone-variant retry + message persistence the flow engine uses).
 *
 * Note: WhatsApp only allows free-form text inside the 24-hour customer
 * service window; outside it, Meta requires an approved template.
 */
export async function POST(request: Request) {
  const ctx = await authenticateApiKey(request)
  if (!ctx) return apiUnauthorized()
  if (!canWrite(ctx)) return Response.json({ error: 'This API key is read-only' }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const rawPhone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!rawPhone) return Response.json({ error: 'phone is required' }, { status: 400 })
  if (!text) return Response.json({ error: 'text is required' }, { status: 400 })
  const phone = normalizePhone(rawPhone)

  const db = adminClient()

  const { data: org } = await db
    .from('organizations')
    .select('owner_id')
    .eq('id', ctx.orgId)
    .maybeSingle()
  if (!org?.owner_id) return Response.json({ error: 'Organization not found' }, { status: 404 })
  const ownerId = org.owner_id as string

  // Find-or-create the contact (org-scoped, owner as the legacy user_id).
  let contactId: string
  const { data: existingContact } = await db
    .from('contacts')
    .select('id')
    .eq('org_id', ctx.orgId)
    .eq('phone', phone)
    .maybeSingle()
  if (existingContact) {
    contactId = existingContact.id
  } else {
    const { data: created, error: cErr } = await db
      .from('contacts')
      .insert({ org_id: ctx.orgId, user_id: ownerId, phone, name: phone })
      .select('id')
      .single()
    if (cErr) return Response.json({ error: cErr.message }, { status: 500 })
    contactId = created.id
  }

  // Find-or-create the conversation.
  let conversationId: string
  const { data: existingConv } = await db
    .from('conversations')
    .select('id')
    .eq('contact_id', contactId)
    .eq('org_id', ctx.orgId)
    .maybeSingle()
  if (existingConv) {
    conversationId = existingConv.id
  } else {
    const { data: created, error: convErr } = await db
      .from('conversations')
      .insert({ org_id: ctx.orgId, user_id: ownerId, contact_id: contactId })
      .select('id')
      .single()
    if (convErr) return Response.json({ error: convErr.message }, { status: 500 })
    conversationId = created.id
  }

  try {
    const { whatsapp_message_id } = await engineSendText({
      userId: ownerId,
      conversationId,
      contactId,
      text,
    })
    return Response.json(
      { ok: true, message_id: whatsapp_message_id, contact_id: contactId, conversation_id: conversationId },
      { status: 201 },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Send failed'
    // "WhatsApp not configured" is the common, actionable case → 400.
    const status = /not configured/i.test(msg) ? 400 : 502
    return Response.json({ error: msg }, { status })
  }
}
