import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrg } from '@/lib/org'
import { encrypt } from '@/lib/whatsapp/encryption'
import { verifyPhoneNumber } from '@/lib/whatsapp/meta-api'

export async function GET() {
  try {
    const supabase = await createClient()
    const { org } = await getCurrentOrg()

    const { data, error } = await supabase
      .from('whatsapp_numbers')
      .select('id, label, phone_number_id, waba_id, display_phone, verified_name, is_default, is_active, status, created_at')
      .eq('org_id', org.id)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ numbers: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { org } = await getCurrentOrg()

    const { label, phone_number_id, waba_id, access_token, verify_token } = await request.json()

    if (!phone_number_id?.trim()) return NextResponse.json({ error: 'Phone Number ID is required' }, { status: 400 })
    if (!access_token?.trim()) return NextResponse.json({ error: 'Access Token is required' }, { status: 400 })

    // Verify with Meta
    let display_phone = ''
    let verified_name = ''
    try {
      const info = await verifyPhoneNumber({
        phoneNumberId: phone_number_id.trim(),
        accessToken: access_token.trim(),
      })
      display_phone = info.display_phone_number ?? ''
      verified_name = info.verified_name ?? ''
    } catch (err) {
      return NextResponse.json({ error: `Meta verification failed: ${err instanceof Error ? err.message : 'Unknown error'}` }, { status: 400 })
    }

    // First number becomes default
    const { count } = await supabase
      .from('whatsapp_numbers')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org.id)

    const isFirst = (count ?? 0) === 0

    const { data, error } = await supabase
      .from('whatsapp_numbers')
      .upsert({
        org_id: org.id,
        label: label?.trim() || verified_name || 'Number ' + ((count ?? 0) + 1),
        phone_number_id: phone_number_id.trim(),
        waba_id: waba_id?.trim() || null,
        access_token: encrypt(access_token.trim()),
        verify_token: verify_token?.trim() || null,
        display_phone,
        verified_name,
        is_default: isFirst,
        is_active: true,
        status: 'active',
      }, { onConflict: 'org_id,phone_number_id' })
      .select('id, label, phone_number_id, waba_id, display_phone, verified_name, is_default, is_active')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ number: data, verified_name, display_phone }, { status: 201 })
  } catch (err) {
    console.error('[whatsapp/numbers POST]', err)
    return NextResponse.json({ error: 'Failed to add number' }, { status: 500 })
  }
}
