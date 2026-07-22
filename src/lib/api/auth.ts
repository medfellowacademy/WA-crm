import { createHash, randomBytes } from 'crypto'
import { adminClient } from '@/lib/org'

/**
 * Public API key auth for the /api/v1/* surface.
 *
 * Keys look like `wacrm_live_<40 hex chars>`. We store only the SHA-256
 * hash; the plaintext is returned once at creation. Callers authenticate
 * with `Authorization: Bearer <key>` or `X-API-Key: <key>`.
 */

const KEY_PREFIX = 'wacrm_live_'

export interface GeneratedKey {
  /** The full plaintext key — shown to the user exactly once. */
  plaintext: string
  /** First ~12 chars, stored for display (e.g. wacrm_live_ab). */
  prefix: string
  /** SHA-256 hex of the plaintext, stored for lookup. */
  hash: string
}

export function generateApiKey(): GeneratedKey {
  const secret = randomBytes(20).toString('hex') // 40 hex chars
  const plaintext = `${KEY_PREFIX}${secret}`
  return {
    plaintext,
    prefix: plaintext.slice(0, 14),
    hash: hashApiKey(plaintext),
  }
}

export function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext.trim()).digest('hex')
}

export interface ApiKeyContext {
  orgId: string
  keyId: string
  scopes: string[]
}

/** Pull the raw key from either supported header. */
function extractKey(request: Request): string | null {
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim()
  const headerKey = request.headers.get('x-api-key')
  if (headerKey) return headerKey.trim()
  return null
}

/**
 * Authenticate a public API request. Returns the org context on success
 * or null if the key is missing, malformed, revoked, or unknown.
 *
 * Uses the admin client because public API callers have no Supabase
 * session — RLS can't scope them, so the key itself is the tenant boundary.
 */
export async function authenticateApiKey(request: Request): Promise<ApiKeyContext | null> {
  const raw = extractKey(request)
  if (!raw || !raw.startsWith(KEY_PREFIX)) return null

  const hash = hashApiKey(raw)
  const db = adminClient()
  const { data, error } = await db
    .from('api_keys')
    .select('id, org_id, scopes, revoked_at')
    .eq('key_hash', hash)
    .is('revoked_at', null)
    .maybeSingle()

  if (error || !data) return null

  // Touch last_used_at — fire-and-forget, never blocks the request.
  void db.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)

  const scopes = Array.isArray(data.scopes) ? (data.scopes as string[]) : []
  return { orgId: data.org_id, keyId: data.id, scopes }
}

/** Standard 401 body for unauthenticated public API requests. */
export function apiUnauthorized(): Response {
  return new Response(
    JSON.stringify({ error: 'Invalid or missing API key. Pass it as `Authorization: Bearer <key>`.' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } },
  )
}

/** True when the key may perform write operations. */
export function canWrite(ctx: ApiKeyContext): boolean {
  return ctx.scopes.includes('write')
}
