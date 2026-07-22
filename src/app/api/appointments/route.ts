import { NextResponse } from 'next/server'
import { getCurrentOrg, adminClient } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { org } = await getCurrentOrg()
    const { data, error } = await supabase
      .from('appointments')
      .select('*, appointment_type:appointment_types(name, color, duration_min), contact:contacts(name, phone)')
      .eq('org_id', org.id)
      .order('starts_at', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ appointments: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// Public booking endpoint — no auth needed, uses admin client
// Called from /book/[slug] page
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      org_slug, appointment_type_id,
      starts_at, booker_name, booker_email, booker_phone, notes,
    } = body

    if (!org_slug || !appointment_type_id || !starts_at || !booker_name || !booker_phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const db = adminClient()

    // Resolve org by slug
    const { data: org } = await db
      .from('organizations')
      .select('id')
      .eq('slug', org_slug)
      .maybeSingle()
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    // Get appointment type for duration
    const { data: apptType } = await db
      .from('appointment_types')
      .select('duration_min, name')
      .eq('id', appointment_type_id)
      .eq('org_id', org.id)
      .maybeSingle()
    if (!apptType) return NextResponse.json({ error: 'Appointment type not found' }, { status: 404 })

    const startsAt = new Date(starts_at)
    const endsAt = new Date(startsAt.getTime() + apptType.duration_min * 60000)

    // Find or create contact
    let contactId: string | null = null
    const { data: existing } = await db
      .from('contacts')
      .select('id')
      .eq('phone', booker_phone)
      .maybeSingle()

    if (existing) {
      contactId = existing.id
    } else {
      const { data: newContact } = await db
        .from('contacts')
        .insert({ phone: booker_phone, name: booker_name, email: booker_email || null })
        .select('id')
        .single()
      contactId = newContact?.id ?? null
    }

    const { data: appt, error } = await db
      .from('appointments')
      .insert({
        org_id: org.id,
        appointment_type_id,
        contact_id: contactId,
        title: `${apptType.name} — ${booker_name}`,
        notes: notes?.trim() || null,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: 'pending',
        booker_name: booker_name.trim(),
        booker_email: booker_email?.trim() || null,
        booker_phone: booker_phone.trim(),
      })
      .select('id, title, starts_at, ends_at, status')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ appointment: appt }, { status: 201 })
  } catch (err) {
    console.error('[appointments POST]', err)
    return NextResponse.json({ error: 'Failed to book appointment' }, { status: 500 })
  }
}
