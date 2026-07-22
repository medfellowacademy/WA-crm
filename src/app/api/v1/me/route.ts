import { adminClient } from '@/lib/org'
import { authenticateApiKey, apiUnauthorized } from '@/lib/api/auth'

/**
 * GET /api/v1/me — validates an API key and returns basic org info.
 * Used by Zapier/Make as the "Test Authentication" endpoint.
 */
export async function GET(request: Request) {
  const ctx = await authenticateApiKey(request)
  if (!ctx) return apiUnauthorized()

  const { data: org } = await adminClient()
    .from('organizations')
    .select('id, name, plan')
    .eq('id', ctx.orgId)
    .maybeSingle()

  return Response.json({
    org: org ?? { id: ctx.orgId },
    scopes: ctx.scopes,
  })
}
