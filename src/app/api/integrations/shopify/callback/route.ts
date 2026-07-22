import { NextResponse } from 'next/server'
import {
  exchangeShopifyCode,
  registerShopifyWebhooks,
  verifyShopifyOAuthHmac,
  normalizeShopDomain,
} from '@/lib/integrations/shopify'
import { saveConnection } from '@/lib/integrations/connections'

/**
 * GET /api/integrations/shopify/callback — OAuth redirect target.
 * Verifies the HMAC, exchanges the code, stores the token, and registers
 * the order/customer webhooks.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const params = url.searchParams
  const code = params.get('code')
  const shop = params.get('shop')
  const orgId = params.get('state')
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin
  const settings = `${base}/settings?tab=integrations`

  if (!code || !shop || !orgId || !verifyShopifyOAuthHmac(params)) {
    return NextResponse.redirect(`${settings}&shopify=error`)
  }

  try {
    const accessToken = await exchangeShopifyCode(shop, code)
    const domain = normalizeShopDomain(shop)

    await saveConnection({
      orgId,
      provider: 'shopify',
      accessToken,
      externalId: domain,
      metadata: { shop: domain },
    })

    // Best-effort webhook registration — failures here don't block connect.
    await registerShopifyWebhooks(shop, accessToken)

    return NextResponse.redirect(`${settings}&shopify=connected`)
  } catch (err) {
    console.error('[shopify/callback]', err)
    return NextResponse.redirect(`${settings}&shopify=error`)
  }
}
