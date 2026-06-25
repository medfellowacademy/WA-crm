import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrg, adminClient } from '@/lib/org'
import { encrypt } from '@/lib/whatsapp/encryption'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { org } = await getCurrentOrg()

    const { data } = await adminClient()
      .from('organizations')
      .select('openai_model, ai_system_prompt, openai_api_key')
      .eq('id', org.id)
      .single()

    return NextResponse.json({
      openai_model:      data?.openai_model ?? 'gpt-4o-mini',
      ai_system_prompt:  data?.ai_system_prompt ?? '',
      has_api_key:       !!data?.openai_api_key,
    })
  } catch (err) {
    console.error('[integrations/openai GET]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { org } = await getCurrentOrg()

    const { openai_api_key, openai_model, ai_system_prompt } = await request.json()

    const update: Record<string, string> = {}
    if (openai_api_key) update.openai_api_key = encrypt(openai_api_key)
    if (openai_model)   update.openai_model   = openai_model
    if (ai_system_prompt !== undefined) update.ai_system_prompt = ai_system_prompt

    await adminClient().from('organizations').update(update).eq('id', org.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[integrations/openai POST]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
