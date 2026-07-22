import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrg, adminClient } from '@/lib/org'
import { stripe } from '@/lib/billing/stripe'
import { normalizePhone } from '@/lib/whatsapp/phone-utils'
import { engineSendText } from '@/lib/flows/meta-send'

/**
 * POST /api/commerce/payment-link
 * Body: { product_id, phone?, send? }
 *
 * Creates a Stripe Payment Link for a catalog product. If `phone` + `send`
 * are provided, also delivers the link over WhatsApp to that customer.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { org, userId } = await getCurrentOrg()
    const body = await request.json()

    const productId = body.product_id
    if (!productId) return NextResponse.json({ error: 'product_id is required' }, { status: 400 })

    const { data: product } = await supabase
      .from('products')
      .select('id, name, price, currency, image_url')
      .eq('id', productId)
      .eq('org_id', org.id)
      .maybeSingle()
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    if (!Number(product.price) || Number(product.price) <= 0) {
      return NextResponse.json({ error: 'Product needs a price above 0 to create a payment link' }, { status: 400 })
    }

    // Create an inline Stripe price, then a payment link for it.
    let url: string
    try {
      const price = await stripe().prices.create({
        currency: (product.currency || 'USD').toLowerCase(),
        unit_amount: Math.round(Number(product.price) * 100),
        product_data: { name: product.name },
      })
      const link = await stripe().paymentLinks.create({
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: { org_id: org.id, product_id: product.id },
      })
      url = link.url
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Stripe error'
      // STRIPE_SECRET_KEY missing → actionable config error.
      const status = /not set/i.test(msg) ? 503 : 502
      return NextResponse.json({ error: `Could not create payment link: ${msg}` }, { status })
    }

    // Optionally send the link over WhatsApp.
    let sent = false
    if (body.send && body.phone) {
      const phone = normalizePhone(String(body.phone))
      const db = adminClient()

      let contactId: string
      const { data: existing } = await db
        .from('contacts').select('id').eq('org_id', org.id).eq('phone', phone).maybeSingle()
      if (existing) {
        contactId = existing.id
      } else {
        const { data: created } = await db
          .from('contacts').insert({ org_id: org.id, user_id: userId, phone, name: phone })
          .select('id').single()
        contactId = created!.id
      }

      let conversationId: string
      const { data: conv } = await db
        .from('conversations').select('id').eq('contact_id', contactId).eq('org_id', org.id).maybeSingle()
      if (conv) {
        conversationId = conv.id
      } else {
        const { data: created } = await db
          .from('conversations').insert({ org_id: org.id, user_id: userId, contact_id: contactId })
          .select('id').single()
        conversationId = created!.id
      }

      const money = new Intl.NumberFormat(undefined, {
        style: 'currency', currency: product.currency || 'USD',
      }).format(Number(product.price))
      const text = `${product.name} — ${money}\nComplete your purchase securely here: ${url}`

      try {
        await engineSendText({ userId, conversationId, contactId, text })
        sent = true
      } catch (err) {
        // Link still created — report partial success rather than failing.
        console.error('[commerce/payment-link] send failed:', err)
      }
    }

    return NextResponse.json({ url, sent })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
