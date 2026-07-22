import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrg } from '@/lib/org'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { org, userId } = await getCurrentOrg()
    const { conversation_id, text } = await req.json()

    if (!conversation_id || !text?.trim()) {
      return NextResponse.json({ error: 'conversation_id and text are required' }, { status: 400 })
    }

    const { data: conv } = await supabase
      .from('conversations')
      .select('id, org_id')
      .eq('id', conversation_id)
      .eq('org_id', org.id)
      .maybeSingle()

    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        sender_type: 'agent',
        sender_id: userId,
        content_type: 'text',
        content_text: text.trim(),
        is_internal: true,
        status: 'sent',
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ id: data.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
