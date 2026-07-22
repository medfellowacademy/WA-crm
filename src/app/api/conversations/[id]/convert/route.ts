import { NextResponse } from 'next/server'
import { getCurrentOrg } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { org } = await getCurrentOrg()
    const { id } = await params
    const { value, note } = await req.json()

    const { data, error } = await supabase
      .from('conversations')
      .update({
        conversion_value: value != null && value !== '' ? Number(value) : null,
        converted_at: new Date().toISOString(),
        conversion_note: note?.trim() || null,
      })
      .eq('id', id)
      .eq('org_id', org.id)
      .select('id, conversion_value, converted_at, conversion_note')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ conversation: data })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { org } = await getCurrentOrg()
    const { id } = await params

    const { error } = await supabase
      .from('conversations')
      .update({ conversion_value: null, converted_at: null, conversion_note: null })
      .eq('id', id)
      .eq('org_id', org.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
