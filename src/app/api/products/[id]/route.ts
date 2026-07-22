import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrg } from '@/lib/org'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { org } = await getCurrentOrg()
    const { id } = await params
    const body = await request.json()

    const patch: Record<string, unknown> = {}
    if (typeof body.name === 'string') patch.name = body.name.trim()
    if ('description' in body) patch.description = body.description?.trim() || null
    if ('price' in body) patch.price = Number(body.price) || 0
    if ('currency' in body) patch.currency = (body.currency || 'USD').toUpperCase()
    if ('image_url' in body) patch.image_url = body.image_url?.trim() || null
    if ('sku' in body) patch.sku = body.sku?.trim() || null
    if (typeof body.is_active === 'boolean') patch.is_active = body.is_active

    const { data, error } = await supabase
      .from('products')
      .update(patch)
      .eq('id', id)
      .eq('org_id', org.id)
      .select('id, name, description, price, currency, image_url, sku, is_active, created_at')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ product: data })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { org } = await getCurrentOrg()
    const { id } = await params
    const { error } = await supabase.from('products').delete().eq('id', id).eq('org_id', org.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
