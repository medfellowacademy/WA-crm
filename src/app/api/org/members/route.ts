import { NextResponse } from 'next/server'
import { getCurrentOrg, adminClient } from '@/lib/org'

export async function GET() {
  try {
    const { org } = await getCurrentOrg()
    const db = adminClient()

    const { data, error } = await db
      .from('org_members')
      .select('id, email, role, accepted_at, user_id, created_at')
      .eq('org_id', org.id)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ members: data ?? [], org })
  } catch (err) {
    console.error('[org/members GET]', err)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
