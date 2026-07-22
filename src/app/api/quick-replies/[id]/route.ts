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
    await supabase.from('quick_replies').delete().eq('id', id).eq('org_id', org.id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { org } = await getCurrentOrg()
    const { id } = await params
    const { shortcut, message } = await req.json()
    const { data, error } = await supabase
      .from('quick_replies')
      .update({ shortcut: shortcut?.trim(), message: message?.trim() })
      .eq('id', id)
      .eq('org_id', org.id)
      .select('id, shortcut, message, created_at')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ reply: data })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
