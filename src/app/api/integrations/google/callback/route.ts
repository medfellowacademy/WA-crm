import { NextResponse } from 'next/server'
import { exchangeGoogleCode } from '@/lib/integrations/google'
import { saveConnection } from '@/lib/integrations/connections'

/**
 * GET /api/integrations/google/callback — OAuth redirect target.
 * Exchanges the code for tokens and stores them against the org from `state`.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const orgId = url.searchParams.get('state')
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin
  const settings = `${base}/settings?tab=integrations`

  if (!code || !orgId) {
    return NextResponse.redirect(`${settings}&google=error`)
  }

  try {
    const tokens = await exchangeGoogleCode(code)
    await saveConnection({
      orgId,
      provider: 'google_sheets',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
    })
    return NextResponse.redirect(`${settings}&google=connected`)
  } catch (err) {
    console.error('[google/callback]', err)
    return NextResponse.redirect(`${settings}&google=error`)
  }
}
