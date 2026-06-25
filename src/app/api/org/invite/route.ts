import { NextResponse } from 'next/server'
import { getCurrentOrg, adminClient } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { org, member } = await getCurrentOrg()

    if (!['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Only owners and admins can invite members' }, { status: 403 })
    }

    const { email, role = 'member' } = await request.json()
    if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })
    if (!['admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const db = adminClient()

    // Check if already a member
    const { data: existing } = await db
      .from('org_members')
      .select('id, accepted_at')
      .eq('org_id', org.id)
      .eq('email', email)
      .maybeSingle()

    if (existing?.accepted_at) {
      return NextResponse.json({ error: 'This person is already a member' }, { status: 409 })
    }

    // Generate a secure invite token
    const token = crypto.randomUUID() + '-' + crypto.randomUUID()

    if (existing) {
      // Re-send invite — update the token
      await db.from('org_members').update({ invite_token: token, role }).eq('id', existing.id)
    } else {
      await db.from('org_members').insert({
        org_id: org.id,
        email,
        role,
        invited_by: user.id,
        invite_token: token,
      })
    }

    // In production, send an email here (e.g. via Resend/SendGrid)
    // For now, return the invite link so it can be shared manually
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const inviteUrl = `${appUrl}/invite/${token}`

    return NextResponse.json({ success: true, invite_url: inviteUrl })
  } catch (err) {
    console.error('[org/invite]', err)
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }
}
