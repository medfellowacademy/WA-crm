/**
 * Shared WhatsApp credential resolver for multi-WABA support.
 *
 * All outbound senders (send, broadcast, automations, flows, react,
 * auto-reply) must call resolveWaCredentials() instead of querying
 * whatsapp_config directly. This gives every org the ability to run
 * multiple WhatsApp numbers and have each conversation/broadcast routed
 * through the number it arrived on (or the org default).
 *
 * Resolution order:
 *   1. Specific waNumberId  — used when the conversation already knows
 *      which number it belongs to (conversations.whatsapp_number_id).
 *   2. Org default          — the number marked is_default = true.
 *   3. Any active number    — safety net; takes the oldest active row.
 *   4. Throw                — org has no active numbers at all.
 */

import { decrypt } from '@/lib/whatsapp/encryption'

// Use SupabaseClient from the service-role / server clients — both
// share the same interface for .from() queries.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any

export interface WaCredentials {
  /** Meta phone_number_id (the WABA phone identifier, not the phone number itself) */
  phoneNumberId: string
  /** Decrypted access token ready to pass to Meta API calls */
  accessToken: string
  /** Internal whatsapp_numbers.id — useful to store on new conversations */
  waNumberId: string
  /** Human-readable label for logging / UI */
  label: string
  /** E.164 display phone, e.g. "+1 415 555 2671" */
  displayPhone: string
}

export async function resolveWaCredentials(
  db: AnySupabaseClient,
  orgId: string,
  waNumberId?: string | null,
): Promise<WaCredentials> {
  // ── 1. Specific number (conversation already knows which one) ──────
  if (waNumberId) {
    const { data } = await db
      .from('whatsapp_numbers')
      .select('id, phone_number_id, access_token, label, display_phone')
      .eq('id', waNumberId)
      .eq('org_id', orgId)
      .eq('is_active', true)
      .maybeSingle()

    if (data) {
      return {
        phoneNumberId: data.phone_number_id,
        accessToken: decrypt(data.access_token),
        waNumberId: data.id,
        label: data.label ?? '',
        displayPhone: data.display_phone ?? '',
      }
    }
    // Number was deactivated or deleted — fall through to default
  }

  // ── 2. Org default ────────────────────────────────────────────────
  const { data: def } = await db
    .from('whatsapp_numbers')
    .select('id, phone_number_id, access_token, label, display_phone')
    .eq('org_id', orgId)
    .eq('is_default', true)
    .eq('is_active', true)
    .maybeSingle()

  if (def) {
    return {
      phoneNumberId: def.phone_number_id,
      accessToken: decrypt(def.access_token),
      waNumberId: def.id,
      label: def.label ?? '',
      displayPhone: def.display_phone ?? '',
    }
  }

  // ── 3. Any active number ──────────────────────────────────────────
  const { data: any } = await db
    .from('whatsapp_numbers')
    .select('id, phone_number_id, access_token, label, display_phone')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (any) {
    return {
      phoneNumberId: any.phone_number_id,
      accessToken: decrypt(any.access_token),
      waNumberId: any.id,
      label: any.label ?? '',
      displayPhone: any.display_phone ?? '',
    }
  }

  // ── 4. Nothing found ──────────────────────────────────────────────
  throw new Error(
    `No active WhatsApp number configured for org ${orgId}. ` +
      'Go to Settings → WhatsApp to connect a number.',
  )
}
