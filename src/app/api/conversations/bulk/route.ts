import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type BulkAction =
  | { type: 'close' }
  | { type: 'reopen' }
  | { type: 'assign'; agentId: string | null }
  | { type: 'tag'; tagId: string }
  | { type: 'untag'; tagId: string }
  | { type: 'mark_read' }

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { conversationIds: string[]; action: BulkAction }
  const { conversationIds, action } = body

  if (!conversationIds?.length) {
    return NextResponse.json({ error: 'No conversations selected' }, { status: 400 })
  }
  if (conversationIds.length > 100) {
    return NextResponse.json({ error: 'Max 100 at a time' }, { status: 400 })
  }

  switch (action.type) {
    case 'close':
    case 'reopen': {
      const status = action.type === 'close' ? 'closed' : 'open'
      const { error } = await supabase
        .from('conversations')
        .update({ status, updated_at: new Date().toISOString() })
        .in('id', conversationIds)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      break
    }

    case 'assign': {
      const { error } = await supabase
        .from('conversations')
        .update({ assigned_agent_id: action.agentId, updated_at: new Date().toISOString() })
        .in('id', conversationIds)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      break
    }

    case 'mark_read': {
      const { error } = await supabase
        .from('conversations')
        .update({ unread_count: 0, updated_at: new Date().toISOString() })
        .in('id', conversationIds)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      break
    }

    case 'tag':
    case 'untag': {
      // Get contact_ids for these conversations
      const { data: convs, error: convErr } = await supabase
        .from('conversations')
        .select('contact_id')
        .in('id', conversationIds)
      if (convErr) return NextResponse.json({ error: convErr.message }, { status: 500 })

      const contactIds = (convs ?? []).map((c) => c.contact_id).filter(Boolean)
      if (contactIds.length === 0) break

      if (action.type === 'tag') {
        const rows = contactIds.map((cid) => ({ contact_id: cid, tag_id: action.tagId }))
        const { error } = await supabase
          .from('contact_tags')
          .upsert(rows, { onConflict: 'contact_id,tag_id' })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      } else {
        const { error } = await supabase
          .from('contact_tags')
          .delete()
          .in('contact_id', contactIds)
          .eq('tag_id', action.tagId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      }
      break
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  return NextResponse.json({ success: true, affected: conversationIds.length })
}
