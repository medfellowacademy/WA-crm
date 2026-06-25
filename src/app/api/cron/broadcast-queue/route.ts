import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Broadcast Queue Cron
 *
 * Picks up queued/stalled broadcasts and kicks off server-side
 * processing for each one. Runs on a schedule (e.g. every minute
 * via Vercel cron or an external scheduler).
 *
 * Stall detection: a broadcast stuck in 'sending' for more than
 * 10 minutes is assumed to have crashed and is re-queued.
 */

const STALL_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  // Vercel cron passes Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = supabaseAdmin()
  const now = new Date()
  const stallCutoff = new Date(now.getTime() - STALL_TIMEOUT_MS).toISOString()

  // Re-queue broadcasts stuck in 'sending' for too long
  await db
    .from('broadcasts')
    .update({ status: 'queued', processing_started_at: null })
    .eq('status', 'sending')
    .lt('processing_started_at', stallCutoff)

  // Fetch all queued broadcasts
  const { data: queued, error } = await db
    .from('broadcasts')
    .select('id')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(10) // Process up to 10 broadcasts per cron tick

  if (error || !queued || queued.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.headers.get('origin') ?? ''
  const cronSecret2 = process.env.CRON_SECRET

  // Kick off processing for each queued broadcast (fire-and-forget)
  const dispatched = queued.map(({ id }) =>
    fetch(`${baseUrl}/api/broadcasts/${id}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cronSecret2 ? { Authorization: `Bearer ${cronSecret2}` } : {}),
      },
    }).catch((err) => console.error(`[broadcast-queue] dispatch ${id} failed:`, err))
  )

  await Promise.allSettled(dispatched)

  return NextResponse.json({ processed: queued.length })
}
