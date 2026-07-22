import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Minimal Shopify OAuth + webhook helpers. Inert until SHOPIFY_API_KEY /
 * SHOPIFY_API_SECRET are set.
 */

const API_VERSION = '2024-01'
const SCOPES = 'read_orders,read_customers'

export function shopifyConfigured(): boolean {
  return Boolean(process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET)
}

function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  return `${base}/api/integrations/shopify/callback`
}

/** Normalize "mystore" or "mystore.myshopify.com" → full domain. */
export function normalizeShopDomain(shop: string): string {
  const s = shop.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  return s.endsWith('.myshopify.com') ? s : `${s}.myshopify.com`
}

export function shopifyAuthUrl(shop: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.SHOPIFY_API_KEY!,
    scope: SCOPES,
    redirect_uri: redirectUri(),
    state,
  })
  return `https://${normalizeShopDomain(shop)}/admin/oauth/authorize?${params.toString()}`
}

export async function exchangeShopifyCode(shop: string, code: string): Promise<string> {
  const res = await fetch(`https://${normalizeShopDomain(shop)}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    }),
  })
  if (!res.ok) throw new Error(`Shopify token exchange failed: ${res.status}`)
  const data = (await res.json()) as { access_token: string }
  return data.access_token
}

/** Register the order + customer webhooks that drive contact creation. */
export async function registerShopifyWebhooks(shop: string, accessToken: string): Promise<void> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const address = `${base}/api/integrations/shopify/webhook`
  const topics = ['orders/create', 'customers/create']

  await Promise.allSettled(
    topics.map((topic) =>
      fetch(`https://${normalizeShopDomain(shop)}/admin/api/${API_VERSION}/webhooks.json`, {
        method: 'POST',
        headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook: { topic, address, format: 'json' } }),
      }),
    ),
  )
}

/** Verify the OAuth callback HMAC (query-string based). */
export function verifyShopifyOAuthHmac(searchParams: URLSearchParams): boolean {
  const secret = process.env.SHOPIFY_API_SECRET
  if (!secret) return false
  const hmac = searchParams.get('hmac') ?? ''
  const pairs: string[] = []
  searchParams.forEach((value, key) => {
    if (key === 'hmac' || key === 'signature') return
    pairs.push(`${key}=${value}`)
  })
  const message = pairs.sort().join('&')
  const digest = createHmac('sha256', secret).update(message).digest('hex')
  return safeEqualHex(digest, hmac)
}

/** Verify a webhook payload HMAC (base64, over the raw body). */
export function verifyShopifyWebhookHmac(rawBody: string, hmacHeader: string | null): boolean {
  const secret = process.env.SHOPIFY_API_SECRET
  if (!secret || !hmacHeader) return false
  const digest = createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64')
  try {
    const a = Buffer.from(digest)
    const b = Buffer.from(hmacHeader)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a, 'hex')
    const bb = Buffer.from(b, 'hex')
    return ab.length === bb.length && timingSafeEqual(ab, bb)
  } catch {
    return false
  }
}
