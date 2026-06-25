import { NextResponse } from 'next/server'
import { getCurrentOrg, adminClient } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { org, member } = await getCurrentOrg()
    if (!['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const db = adminClient()

    // Cannot remove the owner
    const { data: target } = await db
      .from('org_members')
      .select('role, user_id')
      .eq('id', id)
      .eq('org_id', org.id)
      .single()

    if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    if (target.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove the org owner' }, { status: 400 })
    }
    // Admins can only remove members, not other admins
    if (member.role === 'admin' && target.role === 'admin') {
      return NextResponse.json({ error: 'Admins cannot remove other admins' }, { status: 403 })
    }

    await db.from('org_members').delete().eq('id', id).eq('org_id', org.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[org/members/delete]', err)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { org, member } = await getCurrentOrg()
    if (member.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can change roles' }, { status: 403 })
    }

    const { id } = await params
    const { role } = await request.json()
    if (!['admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const db = adminClient()
    await db.from('org_members').update({ role }).eq('id', id).eq('org_id', org.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[org/members/patch]', err)
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
}
