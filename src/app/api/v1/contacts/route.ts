import { adminClient } from '@/lib/org'
import { authenticateApiKey, apiUnauthorized, canWrite } from '@/lib/api/auth'
import { normalizePhone } from '@/lib/whatsapp/phone-utils'

/**
 * GET /api/v1/contacts — list contacts for the authenticated org.
 * Query params: ?limit=50&offset=0&phone=<exact>&search=<name/phone>
 */
export async function GET(request: Request) {
  const ctx = await authenticateApiKey(request)
  if (!ctx) return apiUnauthorized()

  const url = new URL(request.url)
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200)
  const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0)
  const phone = url.searchParams.get('phone')
  const search = url.searchParams.get('search')

  const db = adminClient()
  let query = db
    .from('contacts')
    .select('id, name, phone, email, company, source, created_at', { count: 'exact' })
    .eq('org_id', ctx.orgId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (phone) query = query.eq('phone', normalizePhone(phone))
  else if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)

  const { data, count, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ data: data ?? [], total: count ?? 0, limit, offset })
}

/**
 * POST /api/v1/contacts — create or update a contact (upsert by phone).
 * Body: { phone (required), name?, email?, company?, source? }
 *
 * This is the headline integration action — "push a customer from
 * Shopify / HubSpot / a Google Sheet into the CRM".
 */
export async function POST(request: Request) {
  const ctx = await authenticateApiKey(request)
  if (!ctx) return apiUnauthorized()
  if (!canWrite(ctx)) {
    return Response.json({ error: 'This API key is read-only' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const rawPhone = typeof body.phone === 'string' ? body.phone.trim() : ''
  if (!rawPhone) return Response.json({ error: 'phone is required' }, { status: 400 })
  const phone = normalizePhone(rawPhone)

  const db = adminClient()

  // The org's owner is used for the legacy NOT NULL user_id column.
  const { data: org } = await db
    .from('organizations')
    .select('owner_id')
    .eq('id', ctx.orgId)
    .maybeSingle()
  if (!org?.owner_id) return Response.json({ error: 'Organization not found' }, { status: 404 })

  const fields = {
    name: typeof body.name === 'string' ? body.name.trim() || null : null,
    email: typeof body.email === 'string' ? body.email.trim() || null : null,
    company: typeof body.company === 'string' ? body.company.trim() || null : null,
    source: typeof body.source === 'string' ? body.source.trim() || null : null,
  }

  // Upsert-by-phone within the org: update if it exists, else insert.
  const { data: existing } = await db
    .from('contacts')
    .select('id')
    .eq('org_id', ctx.orgId)
    .eq('phone', phone)
    .maybeSingle()

  if (existing) {
    // Only overwrite provided (non-null) fields, leave the rest intact.
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const [k, v] of Object.entries(fields)) if (v !== null) patch[k] = v

    const { data, error } = await db
      .from('contacts')
      .update(patch)
      .eq('id', existing.id)
      .select('id, name, phone, email, company, source, created_at')
      .single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ data, created: false })
  }

  const { data, error } = await db
    .from('contacts')
    .insert({
      org_id: ctx.orgId,
      user_id: org.owner_id,
      phone,
      name: fields.name || phone,
      email: fields.email,
      company: fields.company,
      source: fields.source,
    })
    .select('id, name, phone, email, company, source, created_at')
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ data, created: true }, { status: 201 })
}
