import { adminClient } from '@/lib/org'
import { authenticateApiKey, apiUnauthorized, canWrite } from '@/lib/api/auth'
import type { WebhookEvent } from '@/lib/integrations/webhooks'

const ALLOWED_EVENTS: WebhookEvent[] = [
  'new_message', 'new_contact', 'conversation_opened',
  'conversation_closed', 'deal_created', 'deal_updated', 'broadcast_sent',
]

/**
 * POST /api/v1/webhooks — REST Hook subscribe (used by Zapier/Make triggers).
 * Body: { target_url, event } — registers a webhook_endpoint the dispatcher
 * will POST to when that event fires. Returns { id } for later unsubscribe.
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

  const targetUrl = typeof body.target_url === 'string' ? body.target_url.trim() : ''
  const event = typeof body.event === 'string' ? body.event.trim() : ''
  if (!targetUrl) return Response.json({ error: 'target_url is required' }, { status: 400 })
  if (!ALLOWED_EVENTS.includes(event as WebhookEvent)) {
    return Response.json({ error: `event must be one of: ${ALLOWED_EVENTS.join(', ')}` }, { status: 400 })
  }

  const db = adminClient()
  const { data: org } = await db
    .from('organizations')
    .select('owner_id')
    .eq('id', ctx.orgId)
    .maybeSingle()
  if (!org?.owner_id) return Response.json({ error: 'Organization not found' }, { status: 404 })

  const { data, error } = await db
    .from('webhook_endpoints')
    .insert({
      org_id: ctx.orgId,
      user_id: org.owner_id,
      name: `Zapier: ${event}`,
      url: targetUrl,
      events: [event],
    })
    .select('id')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ id: data.id }, { status: 201 })
}
