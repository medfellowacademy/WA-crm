import { adminClient } from '@/lib/org'
import { authenticateApiKey, apiUnauthorized, canWrite } from '@/lib/api/auth'

/**
 * POST /api/v1/contacts/:id/tags — add a tag to a contact by name.
 * Body: { tag: "VIP" }  — the tag is created for the org if it doesn't exist.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await authenticateApiKey(request)
  if (!ctx) return apiUnauthorized()
  if (!canWrite(ctx)) {
    return Response.json({ error: 'This API key is read-only' }, { status: 403 })
  }

  const { id: contactId } = await params
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const tagName = typeof body.tag === 'string' ? body.tag.trim() : ''
  if (!tagName) return Response.json({ error: 'tag is required' }, { status: 400 })

  const db = adminClient()

  // Contact must belong to the key's org.
  const { data: contact } = await db
    .from('contacts')
    .select('id')
    .eq('id', contactId)
    .eq('org_id', ctx.orgId)
    .maybeSingle()
  if (!contact) return Response.json({ error: 'Contact not found' }, { status: 404 })

  // Find-or-create the tag within the org.
  const { data: org } = await db
    .from('organizations')
    .select('owner_id')
    .eq('id', ctx.orgId)
    .maybeSingle()

  let tagId: string
  const { data: existingTag } = await db
    .from('tags')
    .select('id')
    .eq('org_id', ctx.orgId)
    .ilike('name', tagName)
    .maybeSingle()

  if (existingTag) {
    tagId = existingTag.id
  } else {
    const { data: newTag, error: tagErr } = await db
      .from('tags')
      .insert({ org_id: ctx.orgId, user_id: org?.owner_id ?? null, name: tagName })
      .select('id')
      .single()
    if (tagErr) return Response.json({ error: tagErr.message }, { status: 500 })
    tagId = newTag.id
  }

  // Idempotent attach (UNIQUE(contact_id, tag_id) makes re-adds a no-op).
  const { error: linkErr } = await db
    .from('contact_tags')
    .upsert({ contact_id: contactId, tag_id: tagId }, { onConflict: 'contact_id,tag_id' })
  if (linkErr) return Response.json({ error: linkErr.message }, { status: 500 })

  return Response.json({ ok: true, contact_id: contactId, tag: tagName })
}
