import { adminClient } from '@/lib/org'
import { authenticateApiKey, apiUnauthorized, canWrite } from '@/lib/api/auth'

/**
 * DELETE /api/v1/webhooks/:id — REST Hook unsubscribe. Removes the
 * webhook_endpoint Zapier registered, scoped to the key's org.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await authenticateApiKey(request)
  if (!ctx) return apiUnauthorized()
  if (!canWrite(ctx)) return Response.json({ error: 'This API key is read-only' }, { status: 403 })

  const { id } = await params
  const { error } = await adminClient()
    .from('webhook_endpoints')
    .delete()
    .eq('id', id)
    .eq('org_id', ctx.orgId)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
