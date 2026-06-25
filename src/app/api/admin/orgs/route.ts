import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/org'

async function requireSuperAdmin(userId: string) {
  const { data } = await adminClient().from('admin_users').select('user_id').eq('user_id', userId).maybeSingle()
  if (!data) throw new Error('Forbidden')
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await requireSuperAdmin(user.id)

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('q') ?? ''
    const plan   = searchParams.get('plan') ?? ''
    const page   = parseInt(searchParams.get('page') ?? '1')
    const limit  = 20
    const offset = (page - 1) * limit

    let query = adminClient()
      .from('admin_org_overview')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) query = query.ilike('name', `%${search}%`)
    if (plan)   query = query.eq('plan', plan)

    const { data, count, error } = await query
    if (error) throw error

    return NextResponse.json({ orgs: data ?? [], total: count ?? 0, page, limit })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('[admin/orgs]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
