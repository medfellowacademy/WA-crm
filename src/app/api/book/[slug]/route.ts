import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/org'

// Public endpoint — no auth. Returns org info + active appointment types for the booking page.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const db = adminClient()

    const { data: org } = await db
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', slug)
      .maybeSingle()

    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: types } = await db
      .from('appointment_types')
      .select('id, name, description, duration_min, color')
      .eq('org_id', org.id)
      .eq('is_active', true)
      .order('name')

    return NextResponse.json({ org, types: types ?? [] })
  } catch (err) {
    console.error('[book/slug GET]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
