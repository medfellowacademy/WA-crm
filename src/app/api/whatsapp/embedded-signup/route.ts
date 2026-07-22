import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrg } from '@/lib/org'
import { encrypt } from '@/lib/whatsapp/encryption'
import {
  exchangeCodeForToken,
  subscribeAppToWaba,
  verifyPhoneNumber,
} from '@/lib/whatsapp/meta-api'

/**
 * Completes Meta Embedded Signup: takes the authorization `code` plus the
 * `waba_id` / `phone_number_id` the popup reported, provisions everything,
 * and stores the connected number — no manual token pasting required.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { org } = await getCurrentOrg()

    const { code, waba_id, phone_number_id, label } = await request.json()

    if (!code?.trim()) {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 })
    }
    if (!waba_id?.trim() || !phone_number_id?.trim()) {
      return NextResponse.json(
        { error: 'WABA ID and Phone Number ID are required' },
        { status: 400 },
      )
    }

    // 1. Exchange the short-lived code for a business access token.
    let accessToken: string
    try {
      accessToken = await exchangeCodeForToken({ code: code.trim() })
    } catch (err) {
      return NextResponse.json(
        { error: `Token exchange failed: ${err instanceof Error ? err.message : 'Unknown error'}` },
        { status: 400 },
      )
    }

    // 2. Subscribe our app to the WABA so inbound messages hit our webhook.
    try {
      await subscribeAppToWaba({ wabaId: waba_id.trim(), accessToken })
    } catch (err) {
      return NextResponse.json(
        { error: `Could not subscribe to WhatsApp account: ${err instanceof Error ? err.message : 'Unknown error'}` },
        { status: 400 },
      )
    }

    // 3. Confirm the phone number is reachable and grab its display metadata.
    let display_phone = ''
    let verified_name = ''
    try {
      const info = await verifyPhoneNumber({
        phoneNumberId: phone_number_id.trim(),
        accessToken,
      })
      display_phone = info.display_phone_number ?? ''
      verified_name = info.verified_name ?? ''
    } catch (err) {
      return NextResponse.json(
        { error: `Phone verification failed: ${err instanceof Error ? err.message : 'Unknown error'}` },
        { status: 400 },
      )
    }

    // 4. First number for the org becomes the default sender.
    const { count } = await supabase
      .from('whatsapp_numbers')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org.id)

    const isFirst = (count ?? 0) === 0

    const { data, error } = await supabase
      .from('whatsapp_numbers')
      .upsert(
        {
          org_id: org.id,
          label: label?.trim() || verified_name || display_phone || 'WhatsApp',
          phone_number_id: phone_number_id.trim(),
          waba_id: waba_id.trim(),
          access_token: encrypt(accessToken),
          display_phone,
          verified_name,
          is_default: isFirst,
          is_active: true,
          status: 'active',
        },
        { onConflict: 'org_id,phone_number_id' },
      )
      .select('id, label, phone_number_id, waba_id, display_phone, verified_name, is_default, is_active')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ number: data, verified_name, display_phone }, { status: 201 })
  } catch (err) {
    console.error('[whatsapp/embedded-signup POST]', err)
    return NextResponse.json({ error: 'Failed to complete signup' }, { status: 500 })
  }
}
