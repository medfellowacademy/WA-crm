import { NextResponse } from 'next/server'
import { getCurrentOrg } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { org } = await getCurrentOrg()
    const { data, error } = await supabase
      .from('quick_replies')
      .select('id, shortcut, message, created_at')
      .eq('org_id', org.id)
      .order('shortcut')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ replies: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { org, userId } = await getCurrentOrg()
    const { shortcut, message } = await req.json()
    if (!shortcut?.trim()) return NextResponse.json({ error: 'Shortcut is required' }, { status: 400 })
    if (!message?.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    const { data, error } = await supabase
      .from('quick_replies')
      .insert({ org_id: org.id, shortcut: shortcut.trim(), message: message.trim(), created_by: userId })
      .select('id, shortcut, message, created_at')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ reply: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
