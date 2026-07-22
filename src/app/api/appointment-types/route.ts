import { NextResponse } from 'next/server'
import { getCurrentOrg } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { org } = await getCurrentOrg()
    const { data, error } = await supabase
      .from('appointment_types')
      .select('*')
      .eq('org_id', org.id)
      .order('name')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ types: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { org } = await getCurrentOrg()
    const { name, description, duration_min, buffer_min, color } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
    const { data, error } = await supabase
      .from('appointment_types')
      .insert({
        org_id: org.id,
        name: name.trim(),
        description: description?.trim() || null,
        duration_min: duration_min ?? 30,
        buffer_min: buffer_min ?? 5,
        color: color ?? '#6366f1',
      })
      .select('*')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ type: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
