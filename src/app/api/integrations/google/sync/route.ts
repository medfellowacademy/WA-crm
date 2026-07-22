import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrg } from '@/lib/org'
import { getConnection, saveConnection } from '@/lib/integrations/connections'
import { refreshGoogleToken, createSpreadsheet, writeValues } from '@/lib/integrations/google'

/**
 * POST /api/integrations/google/sync — export the org's contacts to a
 * Google Sheet. Creates the sheet on first run, then overwrites it on
 * subsequent runs so the sheet always mirrors the CRM.
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { org } = await getCurrentOrg()

    const conn = await getConnection(org.id, 'google_sheets')
    if (!conn) return NextResponse.json({ error: 'Google Sheets not connected' }, { status: 400 })
    if (!conn.refresh_token) {
      return NextResponse.json({ error: 'Missing Google refresh token — please reconnect' }, { status: 400 })
    }

    // Always refresh — access tokens are short-lived (~1h).
    const accessToken = await refreshGoogleToken(conn.refresh_token)

    // Resolve (or create) the target spreadsheet.
    let spreadsheetId = (conn.metadata.spreadsheet_id as string) || conn.external_id || ''
    if (!spreadsheetId) {
      spreadsheetId = await createSpreadsheet(accessToken, `${org.name} — Contacts`)
      await saveConnection({
        orgId: org.id,
        provider: 'google_sheets',
        accessToken: conn.access_token ?? undefined,
        refreshToken: conn.refresh_token,
        externalId: spreadsheetId,
        metadata: { ...conn.metadata, spreadsheet_id: spreadsheetId },
      })
    }

    const { data: contacts } = await supabase
      .from('contacts')
      .select('name, phone, email, company, source, created_at')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })

    const rows: (string | number)[][] = [
      ['Name', 'Phone', 'Email', 'Company', 'Source', 'Created'],
      ...(contacts ?? []).map((c) => [
        c.name ?? '', c.phone ?? '', c.email ?? '', c.company ?? '', c.source ?? '',
        c.created_at ? new Date(c.created_at).toISOString().slice(0, 10) : '',
      ]),
    ]

    await writeValues(accessToken, spreadsheetId, rows)

    return NextResponse.json({
      ok: true,
      exported: (contacts ?? []).length,
      spreadsheet_url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    })
  } catch (err) {
    console.error('[google/sync]', err)
    const msg = err instanceof Error ? err.message : 'Sync failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
