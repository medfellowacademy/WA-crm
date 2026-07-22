import { NextResponse } from 'next/server'
import { getCurrentOrg, adminClient } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const { org, userId } = await getCurrentOrg()
    const db = adminClient()
    const { data } = await db
      .from('agent_status')
      .select('user_id, status, updated_at')
      .eq('org_id', org.id)
    const myStatus = data?.find((s) => s.user_id === userId)
    return NextResponse.json({
      status: myStatus?.status ?? 'offline',
      statuses: data ?? [],
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await createClient()
    const { org, userId } = await getCurrentOrg()
    const { status } = await req.json()
    if (!['online', 'away', 'offline'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    const { error } = await supabase
      .from('agent_status')
      .upsert({ user_id: userId, org_id: org.id, status, updated_at: new Date().toISOString() })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
