import { NextResponse } from 'next/server'
import { getCurrentOrg } from '@/lib/org'
import { shopifyConfigured, shopifyAuthUrl } from '@/lib/integrations/shopify'

/**
 * GET /api/integrations/shopify/connect?shop=mystore — starts Shopify OAuth.
 * `state` carries the org id so the callback can attribute the install.
 */
export async function GET(request: Request) {
  try {
    const { org } = await getCurrentOrg()
    if (!shopifyConfigured()) {
      return NextResponse.json({ error: 'Shopify integration is not configured on this server' }, { status: 503 })
    }
    const shop = new URL(request.url).searchParams.get('shop')
    if (!shop) return NextResponse.json({ error: 'shop parameter is required' }, { status: 400 })

    return NextResponse.redirect(shopifyAuthUrl(shop, org.id))
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
