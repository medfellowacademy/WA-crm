import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/org'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = await request.json()
    if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 })

    const db = adminClient()

    const { data: invite, error: inviteErr } = await db
      .from('org_members')
      .select('id, email, org_id, accepted_at')
      .eq('invite_token', token)
      .maybeSingle()

    if (inviteErr || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 })
    }
    if (invite.accepted_at) {
      return NextResponse.json({ error: 'Invite already accepted' }, { status: 409 })
    }

    // Accept: bind this auth user to the member row
    await db
      .from('org_members')
      .update({
        user_id: user.id,
        email: user.email ?? invite.email,
        accepted_at: new Date().toISOString(),
        invite_token: null,
      })
      .eq('id', invite.id)

    return NextResponse.json({ success: true, org_id: invite.org_id })
  } catch (err) {
    console.error('[org/invite/accept]', err)
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 })
  }
}
