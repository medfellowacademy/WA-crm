import { NextResponse } from 'next/server'
import { getCurrentOrg } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { org } = await getCurrentOrg()
    const { id } = await params
    await supabase.from('contact_segments').delete().eq('id', id).eq('org_id', org.id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// Returns the contact_ids in a segment (for use in broadcasts)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { org } = await getCurrentOrg()
    const { id } = await params

    const { data: seg } = await supabase
      .from('contact_segments')
      .select('filters')
      .eq('id', id)
      .eq('org_id', org.id)
      .maybeSingle()

    if (!seg) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const f = seg.filters as Record<string, unknown>
    // Collect candidate ID sets from each active filter, then intersect at the end.
    // Using an array of Sets avoids let-mutation narrowing issues in TypeScript.
    const filterSets: Set<string>[] = []

    if (Array.isArray(f.tag_ids) && f.tag_ids.length > 0) {
      const { data } = await supabase.from('contact_tags').select('contact_id').in('tag_id', f.tag_ids as string[])
      filterSets.push(new Set((data ?? []).map((r: { contact_id: string }) => r.contact_id)))
    }
    if (f.has_conversation === true) {
      const { data } = await supabase.from('conversations').select('contact_id').eq('org_id', org.id)
      filterSets.push(new Set((data ?? []).map((c: { contact_id: string }) => c.contact_id)))
    }
    if (f.sentiment) {
      const { data } = await supabase.from('conversations').select('contact_id').eq('org_id', org.id).eq('sentiment', f.sentiment as string)
      filterSets.push(new Set((data ?? []).map((c: { contact_id: string }) => c.contact_id)))
    }
    if (f.inactive_days && Number(f.inactive_days) > 0) {
      const cutoff = new Date(Date.now() - Number(f.inactive_days) * 86400000).toISOString()
      const { data: active } = await supabase.from('conversations').select('contact_id').eq('org_id', org.id).gt('last_message_at', cutoff)
      const activeSet = new Set((active ?? []).map((c: { contact_id: string }) => c.contact_id))
      const { data: all } = await supabase.from('contacts').select('id')
      const inactiveIds = (all ?? []).map((c: { id: string }) => c.id).filter((cid: string) => !activeSet.has(cid))
      filterSets.push(new Set(inactiveIds))
    }
    if (f.is_converted === true) {
      const { data } = await supabase.from('conversations').select('contact_id').eq('org_id', org.id).not('converted_at', 'is', null)
      filterSets.push(new Set((data ?? []).map((c: { contact_id: string }) => c.contact_id)))
    }

    const PLACEHOLDER = '00000000-0000-0000-0000-000000000000'
    let resultIds: string[] | null = null
    if (filterSets.length > 0) {
      let intersection = filterSets[0]
      for (let i = 1; i < filterSets.length; i++) {
        intersection = new Set([...intersection].filter((cid) => filterSets[i].has(cid)))
      }
      resultIds = [...intersection]
    }

    const { data: contacts } = await supabase
      .from('contacts')
      .select('id')
      .in('id', resultIds !== null ? (resultIds.length > 0 ? resultIds : [PLACEHOLDER]) : [])
      .order('name')

    // If no filters at all, return all contacts
    if (resultIds === null) {
      const { data: allContacts } = await supabase.from('contacts').select('id').order('name')
      return NextResponse.json({ contact_ids: (allContacts ?? []).map((c: { id: string }) => c.id) })
    }

    return NextResponse.json({ contact_ids: (contacts ?? []).map((c: { id: string }) => c.id) })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
