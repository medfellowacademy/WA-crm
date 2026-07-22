import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrg, adminClient } from '@/lib/org'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { org } = await getCurrentOrg()

    const { data } = await adminClient()
      .from('ai_agent_config')
      .select('*')
      .eq('org_id', org.id)
      .maybeSingle()

    return NextResponse.json({
      is_enabled: data?.is_enabled ?? false,
      system_prompt: data?.system_prompt ?? '',
      handoff_message: data?.handoff_message ?? '',
      handoff_keywords: data?.handoff_keywords ?? [],
      auto_assign_on_handoff: data?.auto_assign_on_handoff ?? true,
      model: data?.model ?? 'claude-opus-4-8',
      max_autonomous_turns: data?.max_autonomous_turns ?? 6,
      has_anthropic_key: !!process.env.ANTHROPIC_API_KEY,
    })
  } catch (err) {
    console.error('[ai/agent-config GET]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { org } = await getCurrentOrg()

    const body = await request.json()
    const {
      is_enabled,
      system_prompt,
      handoff_message,
      handoff_keywords,
      auto_assign_on_handoff,
      model,
      max_autonomous_turns,
    } = body

    const update: Record<string, unknown> = { org_id: org.id, updated_at: new Date().toISOString() }
    if (is_enabled !== undefined) update.is_enabled = is_enabled
    if (system_prompt !== undefined) update.system_prompt = system_prompt
    if (handoff_message !== undefined) update.handoff_message = handoff_message
    if (handoff_keywords !== undefined) update.handoff_keywords = handoff_keywords
    if (auto_assign_on_handoff !== undefined) update.auto_assign_on_handoff = auto_assign_on_handoff
    if (model !== undefined) update.model = model
    if (max_autonomous_turns !== undefined) update.max_autonomous_turns = max_autonomous_turns

    await adminClient()
      .from('ai_agent_config')
      .upsert(update, { onConflict: 'org_id' })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[ai/agent-config POST]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
