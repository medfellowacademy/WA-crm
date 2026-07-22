import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrg } from '@/lib/org'
import { removeConnection, type IntegrationProvider } from '@/lib/integrations/connections'
import { googleConfigured } from '@/lib/integrations/google'
import { shopifyConfigured } from '@/lib/integrations/shopify'

/** GET — which native providers are configured on the server and connected for this org. */
export async function GET() {
  try {
    const supabase = await createClient()
    const { org } = await getCurrentOrg()

    const { data } = await supabase
      .from('integration_connections')
      .select('provider, external_id, metadata, updated_at')
      .eq('org_id', org.id)
      .eq('is_active', true)

    const connected = new Map((data ?? []).map((c) => [c.provider, c]))

    return NextResponse.json({
      google_sheets: {
        available: googleConfigured(),
        connected: connected.has('google_sheets'),
        meta: connected.get('google_sheets') ?? null,
      },
      shopify: {
        available: shopifyConfigured(),
        connected: connected.has('shopify'),
        meta: connected.get('shopify') ?? null,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

/** DELETE ?provider=google_sheets|shopify — disconnect. */
export async function DELETE(request: Request) {
  try {
    const { org } = await getCurrentOrg()
    const provider = new URL(request.url).searchParams.get('provider') as IntegrationProvider | null
    if (provider !== 'google_sheets' && provider !== 'shopify') {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }
    await removeConnection(org.id, provider)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
