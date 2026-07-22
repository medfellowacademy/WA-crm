import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrg } from '@/lib/org'

export async function GET() {
  try {
    const supabase = await createClient()
    const { org } = await getCurrentOrg()
    const { data, error } = await supabase
      .from('products')
      .select('id, name, description, price, currency, image_url, sku, is_active, created_at')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ products: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { org, userId } = await getCurrentOrg()
    const body = await request.json()
    if (!body.name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const { data, error } = await supabase
      .from('products')
      .insert({
        org_id: org.id,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        price: Number(body.price) || 0,
        currency: (body.currency || 'USD').toUpperCase(),
        image_url: body.image_url?.trim() || null,
        sku: body.sku?.trim() || null,
        created_by: userId,
      })
      .select('id, name, description, price, currency, image_url, sku, is_active, created_at')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ product: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
