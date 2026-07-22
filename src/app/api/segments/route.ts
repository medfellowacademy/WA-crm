import { NextResponse } from 'next/server'
import { getCurrentOrg } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { org } = await getCurrentOrg()
    const { data, error } = await supabase
      .from('contact_segments')
      .select('id, name, description, filters, contact_count, created_at')
      .eq('org_id', org.id)
      .order('name')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ segments: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { org, userId } = await getCurrentOrg()
    const { name, description, filters } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    // Count contacts matching filters
    let query = supabase.from('contacts').select('id', { count: 'exact', head: true })
    const f = filters ?? {}
    if (f.tag_ids?.length) {
      const { data: taggedIds } = await supabase
        .from('contact_tags')
        .select('contact_id')
        .in('tag_id', f.tag_ids)
      const ids = (taggedIds ?? []).map((r: { contact_id: string }) => r.contact_id)
      query = query.in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
    }
    if (f.has_conversation === true) {
      const { data: convContacts } = await supabase.from('conversations').select('contact_id').eq('org_id', org.id)
      const ids = [...new Set((convContacts ?? []).map((c: { contact_id: string }) => c.contact_id))]
      query = query.in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
    }
    if (f.sentiment) {
      const { data: sentimentContacts } = await supabase
        .from('conversations')
        .select('contact_id')
        .eq('org_id', org.id)
        .eq('sentiment', f.sentiment)
      const ids = [...new Set((sentimentContacts ?? []).map((c: { contact_id: string }) => c.contact_id))]
      query = query.in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
    }
    if (f.inactive_days && Number(f.inactive_days) > 0) {
      const cutoff = new Date(Date.now() - Number(f.inactive_days) * 86400000).toISOString()
      const { data: activeContacts } = await supabase
        .from('conversations')
        .select('contact_id')
        .eq('org_id', org.id)
        .gt('last_message_at', cutoff)
      const activeIds = new Set((activeContacts ?? []).map((c: { contact_id: string }) => c.contact_id))
      const { data: allContacts } = await supabase.from('contacts').select('id')
      const inactiveIds = (allContacts ?? []).map((c: { id: string }) => c.id).filter((id: string) => !activeIds.has(id))
      query = query.in('id', inactiveIds.length ? inactiveIds : ['00000000-0000-0000-0000-000000000000'])
    }
    if (f.is_converted === true) {
      const { data: convertedContacts } = await supabase
        .from('conversations')
        .select('contact_id')
        .eq('org_id', org.id)
        .not('converted_at', 'is', null)
      const ids = [...new Set((convertedContacts ?? []).map((c: { contact_id: string }) => c.contact_id))]
      query = query.in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
    }
    const { count } = await query

    const { data, error } = await supabase
      .from('contact_segments')
      .insert({
        org_id: org.id, name: name.trim(),
        description: description?.trim() || null,
        filters: filters ?? {},
        contact_count: count ?? 0,
        created_by: userId,
      })
      .select('id, name, description, filters, contact_count, created_at')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ segment: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
