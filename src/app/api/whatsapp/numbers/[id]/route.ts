import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrg } from '@/lib/org'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { org } = await getCurrentOrg()
    const { id } = await params

    const { data: num } = await supabase
      .from('whatsapp_numbers')
      .select('is_default')
      .eq('id', id)
      .eq('org_id', org.id)
      .single()

    if (!num) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (num.is_default) return NextResponse.json({ error: 'Cannot delete the default number. Set another as default first.' }, { status: 400 })

    await supabase.from('whatsapp_numbers').delete().eq('id', id).eq('org_id', org.id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { org } = await getCurrentOrg()
    const { id } = await params
    const body = await request.json()

    // Set as default: unset all others first
    if (body.is_default === true) {
      await supabase
        .from('whatsapp_numbers')
        .update({ is_default: false })
        .eq('org_id', org.id)

      await supabase
        .from('whatsapp_numbers')
        .update({ is_default: true })
        .eq('id', id)
        .eq('org_id', org.id)

      return NextResponse.json({ success: true })
    }

    // Toggle active
    if (typeof body.is_active === 'boolean') {
      await supabase
        .from('whatsapp_numbers')
        .update({ is_active: body.is_active })
        .eq('id', id)
        .eq('org_id', org.id)
      return NextResponse.json({ success: true })
    }

    // Update label
    if (body.label) {
      await supabase
        .from('whatsapp_numbers')
        .update({ label: body.label })
        .eq('id', id)
        .eq('org_id', org.id)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
