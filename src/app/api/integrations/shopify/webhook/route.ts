import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/org'
import { verifyShopifyWebhookHmac } from '@/lib/integrations/shopify'
import { normalizePhone } from '@/lib/whatsapp/phone-utils'

/**
 * POST /api/integrations/shopify/webhook — receives orders/create and
 * customers/create. Verifies the HMAC, resolves the org from the shop
 * domain, and upserts a contact so new Shopify customers land in the CRM.
 */
export async function POST(request: Request) {
  const rawBody = await request.text()
  const hmac = request.headers.get('x-shopify-hmac-sha256')

  if (!verifyShopifyWebhookHmac(rawBody, hmac)) {
    return NextResponse.json({ error: 'Invalid HMAC' }, { status: 401 })
  }

  const shopDomain = request.headers.get('x-shopify-shop-domain')
  const topic = request.headers.get('x-shopify-topic') ?? ''
  if (!shopDomain) return NextResponse.json({ error: 'Missing shop domain' }, { status: 400 })

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Ack fast; do the work without blocking Shopify's delivery timeout.
  process(shopDomain, topic, payload).catch((err) =>
    console.error('[shopify/webhook] processing failed:', err),
  )
  return NextResponse.json({ ok: true })
}

interface ShopifyCustomer {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
}

async function process(shopDomain: string, topic: string, payload: Record<string, unknown>) {
  const db = adminClient()

  // Resolve the org that owns this shop.
  const { data: conn } = await db
    .from('integration_connections')
    .select('org_id')
    .eq('provider', 'shopify')
    .eq('external_id', shopDomain)
    .eq('is_active', true)
    .maybeSingle()
  if (!conn?.org_id) {
    console.warn('[shopify/webhook] no connection for shop', shopDomain)
    return
  }

  // Extract the customer from either an order or a customer payload.
  const customer: ShopifyCustomer =
    topic === 'orders/create'
      ? ((payload.customer as ShopifyCustomer) ?? {})
      : (payload as ShopifyCustomer)

  const rawPhone = customer.phone || (payload.phone as string | undefined) || ''
  if (!rawPhone) return // no phone → can't be a WhatsApp contact

  const phone = normalizePhone(rawPhone)
  const name = [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim() || phone

  const { data: org } = await db
    .from('organizations').select('owner_id').eq('id', conn.org_id).maybeSingle()
  if (!org?.owner_id) return

  // Upsert by phone within the org.
  const { data: existing } = await db
    .from('contacts').select('id').eq('org_id', conn.org_id).eq('phone', phone).maybeSingle()

  if (existing) {
    await db.from('contacts')
      .update({ email: customer.email || undefined, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await db.from('contacts').insert({
      org_id: conn.org_id,
      user_id: org.owner_id,
      phone,
      name,
      email: customer.email || null,
      source: 'shopify',
    })
  }
}
