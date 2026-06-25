import { createClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/whatsapp/encryption'

export type WebhookEvent =
  | 'new_message'
  | 'new_contact'
  | 'conversation_opened'
  | 'conversation_closed'
  | 'deal_created'
  | 'deal_updated'
  | 'broadcast_sent'

export interface WebhookPayload {
  event: WebhookEvent
  org_id: string
  timestamp: string
  data: Record<string, unknown>
}

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Sign a payload with HMAC-SHA256 using the endpoint's secret.
 * The signature is sent as X-WaCRM-Signature: sha256=<hex> so
 * receivers can verify authenticity (same pattern as GitHub/Stripe).
 */
async function sign(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `sha256=${hex}`
}

/**
 * Fire all active webhook endpoints for the given org and event.
 * Runs fire-and-forget — callers should not await this if they
 * need to stay within a tight response window (e.g. the webhook route).
 */
export async function dispatchWebhookEvent(
  orgId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  const { data: endpoints } = await db()
    .from('webhook_endpoints')
    .select('id, url, secret, events')
    .eq('org_id', orgId)
    .eq('is_active', true)

  if (!endpoints || endpoints.length === 0) return

  const payload: WebhookPayload = {
    event,
    org_id: orgId,
    timestamp: new Date().toISOString(),
    data,
  }
  const body = JSON.stringify(payload)

  await Promise.allSettled(
    endpoints
      .filter(ep => {
        const events = ep.events as string[]
        return Array.isArray(events) && events.includes(event)
      })
      .map(async ep => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent':   'WaCRM-Webhook/1.0',
        }

        if (ep.secret) {
          try {
            const plainSecret = decrypt(ep.secret)
            headers['X-WaCRM-Signature'] = await sign(plainSecret, body)
          } catch { /* skip signing if decrypt fails */ }
        }

        let status = 0
        try {
          const res = await fetch(ep.url, { method: 'POST', headers, body, signal: AbortSignal.timeout(10_000) })
          status = res.status
        } catch {
          status = 0
        }

        // Update last_fired_at + last_status — best-effort
        await db()
          .from('webhook_endpoints')
          .update({ last_fired_at: new Date().toISOString(), last_status: status })
          .eq('id', ep.id)
      })
  )
}
