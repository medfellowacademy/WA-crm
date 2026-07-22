import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { resolveWaCredentials } from '@/lib/whatsapp/credentials'
import { sendProductMessage } from '@/lib/whatsapp/meta-api'
import { sanitizePhoneForMeta, isValidE164 } from '@/lib/whatsapp/phone-utils'
import { createClient } from '@supabase/supabase-js'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversationId, productId, bodyText } = await request.json()
  if (!conversationId || !productId) {
    return NextResponse.json({ error: 'conversationId and productId required' }, { status: 400 })
  }

  const db = supabaseAdmin()

  // Get conversation + contact
  const { data: conv, error: convErr } = await db
    .from('conversations')
    .select('id, org_id, contact:contacts(phone)')
    .eq('id', conversationId)
    .single()

  if (convErr || !conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

  // Get product
  const { data: product, error: prodErr } = await db
    .from('products')
    .select('id, name, sku, price, currency, image_url')
    .eq('id', productId)
    .single()

  if (prodErr || !product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  if (!product.sku) return NextResponse.json({ error: 'Product has no SKU — required for catalog messages' }, { status: 400 })

  // Resolve WA credentials
  const creds = await resolveWaCredentials(db, conv.org_id)

  // Resolve phone
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const phone = (conv.contact as any)?.phone
  if (!phone) return NextResponse.json({ error: 'Contact has no phone' }, { status: 400 })
  const sanitized = sanitizePhoneForMeta(phone)
  if (!isValidE164(sanitized)) return NextResponse.json({ error: 'Invalid phone format' }, { status: 400 })

  // Get catalog ID from org settings (stored in organizations metadata)
  const { data: org } = await db
    .from('organizations')
    .select('metadata')
    .eq('id', conv.org_id)
    .single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const catalogId = (org?.metadata as any)?.meta_catalog_id

  if (!catalogId) {
    // Fallback: send as a regular text message with product info
    const text = `🛍️ *${product.name}*\n💰 ${product.currency ?? 'USD'} ${product.price ?? ''}\n${bodyText ?? ''}`
    const { data: msg } = await db.from('messages').insert({
      conversation_id: conversationId,
      org_id: conv.org_id,
      sender_type: 'agent',
      content_type: 'text',
      content_text: text,
      status: 'sent',
    }).select().single()
    return NextResponse.json({ messageId: msg?.id, fallback: true })
  }

  const result = await sendProductMessage({
    phoneNumberId: creds.phoneNumberId,
    accessToken: creds.accessToken,
    to: sanitized,
    catalogId,
    productRetailerId: product.sku,
    bodyText: bodyText ?? undefined,
  })

  // Store message
  await db.from('messages').insert({
    conversation_id: conversationId,
    org_id: conv.org_id,
    sender_type: 'agent',
    content_type: 'text',
    content_text: `[Product: ${product.name}]`,
    message_id: result.messageId,
    status: 'sent',
  })

  return NextResponse.json({ messageId: result.messageId })
}
