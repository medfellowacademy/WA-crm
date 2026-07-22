import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/optouts — list all opted-out contacts for the org
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const from = (page - 1) * limit

  const { data, error, count } = await supabase
    .from('contact_optouts')
    .select('*, contact:contacts(id, name, phone, avatar_url)', { count: 'exact' })
    .eq('is_active', true)
    .order('opted_out_at', { ascending: false })
    .range(from, from + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, total: count })
}

// DELETE /api/optouts/[contactId] — manually re-subscribe a contact
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { contactId } = await request.json()
  if (!contactId) return NextResponse.json({ error: 'contactId required' }, { status: 400 })

  const { error } = await supabase
    .from('contact_optouts')
    .update({ is_active: false, opted_in_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('contact_id', contactId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// POST /api/optouts — manually opt-out a contact
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { contactId } = await request.json()
  if (!contactId) return NextResponse.json({ error: 'contactId required' }, { status: 400 })

  // Get org_id
  const { data: member } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member?.org_id) return NextResponse.json({ error: 'No org' }, { status: 400 })

  const { error } = await supabase
    .from('contact_optouts')
    .upsert(
      { org_id: member.org_id, contact_id: contactId, opted_out_at: new Date().toISOString(), keyword: 'manual', is_active: true, updated_at: new Date().toISOString() },
      { onConflict: 'org_id,contact_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
