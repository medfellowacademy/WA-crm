/**
 * Minimal Google OAuth + Sheets helpers (no SDK — plain fetch against the
 * REST APIs). Inert until GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are set.
 */

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token'
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'

// Sheets + ability to create files we own.
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
].join(' ')

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  return `${base}/api/integrations/google/callback`
}

export function googleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `${GOOGLE_AUTH}?${params.toString()}`
}

export interface GoogleTokens {
  access_token: string
  refresh_token?: string
  expires_in: number
}

export async function exchangeGoogleCode(code: string): Promise<GoogleTokens> {
  const res = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`)
  return res.json()
}

export async function refreshGoogleToken(refreshToken: string): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status}`)
  const data = (await res.json()) as { access_token: string }
  return data.access_token
}

/** Create a new spreadsheet titled `title`; returns its id. */
export async function createSpreadsheet(accessToken: string, title: string): Promise<string> {
  const res = await fetch(SHEETS_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ properties: { title } }),
  })
  if (!res.ok) throw new Error(`Could not create spreadsheet: ${res.status}`)
  const data = (await res.json()) as { spreadsheetId: string }
  return data.spreadsheetId
}

/** Overwrite the first sheet's values starting at A1. */
export async function writeValues(
  accessToken: string,
  spreadsheetId: string,
  rows: (string | number)[][],
): Promise<void> {
  const range = 'A1'
  const res = await fetch(
    `${SHEETS_API}/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: rows }),
    },
  )
  if (!res.ok) throw new Error(`Could not write to spreadsheet: ${res.status}`)
}
