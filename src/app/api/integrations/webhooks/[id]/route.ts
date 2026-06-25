import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrg, adminClient } from '@/lib/org'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { org } = await getCurrentOrg()
    const { id } = await params
    await adminClient().from('webhook_endpoints').delete().eq('id', id).eq('org_id', org.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[integrations/webhooks DELETE]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { org } = await getCurrentOrg()
    const { id } = await params
    const body = await request.json()
    const allowed = ['name', 'url', 'events', 'is_active']
    const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
    await adminClient().from('webhook_endpoints').update(update).eq('id', id).eq('org_id', org.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[integrations/webhooks PATCH]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
