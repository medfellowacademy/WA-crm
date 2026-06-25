import { NextResponse } from 'next/server'
import { getCurrentOrg, adminClient } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { org } = await getCurrentOrg()
    await adminClient()
      .from('organizations')
      .update({ onboarded_at: new Date().toISOString() })
      .eq('id', org.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[complete-onboarding]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
