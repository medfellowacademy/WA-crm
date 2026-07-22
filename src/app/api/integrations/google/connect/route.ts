import { NextResponse } from 'next/server'
import { getCurrentOrg } from '@/lib/org'
import { googleConfigured, googleAuthUrl } from '@/lib/integrations/google'

/**
 * GET /api/integrations/google/connect — kicks off Google OAuth.
 * Encodes the org id in `state` so the callback can attribute the tokens.
 */
export async function GET() {
  try {
    const { org } = await getCurrentOrg()
    if (!googleConfigured()) {
      return NextResponse.json({ error: 'Google integration is not configured on this server' }, { status: 503 })
    }
    const url = googleAuthUrl(org.id)
    return NextResponse.redirect(url)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
