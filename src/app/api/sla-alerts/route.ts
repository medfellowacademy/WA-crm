import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('sla_alerts')
    .select(`
      id, alert_type, breached_at, is_active,
      conversation:conversations(
        id, status, last_message_at,
        contact:contacts(id, name, phone)
      )
    `)
    .eq('is_active', true)
    .order('breached_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
