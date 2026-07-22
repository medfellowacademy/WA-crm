import { NextResponse } from 'next/server'
import { getCurrentOrg, adminClient } from '@/lib/org'

export async function GET() {
  try {
    const { org } = await getCurrentOrg()
    const db = adminClient()

    const { data: members, error } = await db
      .from('org_members')
      .select('id, email, role, accepted_at, user_id, created_at')
      .eq('org_id', org.id)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Enrich with profile full_name
    const userIds = (members ?? []).map((m) => m.user_id).filter(Boolean)
    let profileMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await db
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds)
      for (const p of profiles ?? []) {
        profileMap[p.user_id] = p.full_name
      }
    }

    const enriched = (members ?? []).map((m) => ({
      ...m,
      full_name: profileMap[m.user_id] ?? m.email,
    }))

    return NextResponse.json({ members: enriched, org })
  } catch (err) {
    console.error('[org/members GET]', err)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
