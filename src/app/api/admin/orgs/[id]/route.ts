import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/org'

async function requireSuperAdmin(userId: string) {
  const { data } = await adminClient().from('admin_users').select('user_id').eq('user_id', userId).maybeSingle()
  if (!data) throw new Error('Forbidden')
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await requireSuperAdmin(user.id)

    const { id } = await params
    const body = await request.json()
    const allowed = ['plan', 'subscription_status']
    const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

    await adminClient().from('organizations').update(update).eq('id', id)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
