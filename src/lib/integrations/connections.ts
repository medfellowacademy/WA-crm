import { adminClient } from '@/lib/org'
import { encrypt, decrypt } from '@/lib/whatsapp/encryption'

export type IntegrationProvider = 'google_sheets' | 'shopify'

export interface IntegrationConnection {
  id: string
  org_id: string
  provider: IntegrationProvider
  access_token: string | null
  refresh_token: string | null
  external_id: string | null
  metadata: Record<string, unknown>
  is_active: boolean
}

/**
 * Upsert a provider connection for an org. Tokens are encrypted at rest.
 * One row per (org, provider) — re-connecting overwrites.
 */
export async function saveConnection(args: {
  orgId: string
  provider: IntegrationProvider
  accessToken?: string | null
  refreshToken?: string | null
  externalId?: string | null
  metadata?: Record<string, unknown>
  connectedBy?: string | null
}): Promise<void> {
  const db = adminClient()
  await db.from('integration_connections').upsert(
    {
      org_id: args.orgId,
      provider: args.provider,
      access_token: args.accessToken ? encrypt(args.accessToken) : null,
      refresh_token: args.refreshToken ? encrypt(args.refreshToken) : null,
      external_id: args.externalId ?? null,
      metadata: args.metadata ?? {},
      is_active: true,
      connected_by: args.connectedBy ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id,provider' },
  )
}

/** Fetch a connection with tokens decrypted (or null if not connected). */
export async function getConnection(
  orgId: string,
  provider: IntegrationProvider,
): Promise<IntegrationConnection | null> {
  const db = adminClient()
  const { data } = await db
    .from('integration_connections')
    .select('*')
    .eq('org_id', orgId)
    .eq('provider', provider)
    .eq('is_active', true)
    .maybeSingle()
  if (!data) return null

  return {
    ...data,
    access_token: data.access_token ? safeDecrypt(data.access_token) : null,
    refresh_token: data.refresh_token ? safeDecrypt(data.refresh_token) : null,
    metadata: (data.metadata as Record<string, unknown>) ?? {},
  }
}

export async function removeConnection(orgId: string, provider: IntegrationProvider): Promise<void> {
  await adminClient().from('integration_connections').delete().eq('org_id', orgId).eq('provider', provider)
}

function safeDecrypt(v: string): string | null {
  try { return decrypt(v) } catch { return null }
}
