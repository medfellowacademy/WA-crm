import { NextResponse } from 'next/server'
import { getCurrentOrg } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { org } = await getCurrentOrg()

    const { data } = await supabase
      .from('conversations')
      .select('conversion_value, converted_at')
      .eq('org_id', org.id)
      .not('converted_at', 'is', null)

    const rows = data ?? []
    const total = rows.reduce((sum, c) => sum + (c.conversion_value ?? 0), 0)

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonth = rows
      .filter((c) => c.converted_at && new Date(c.converted_at) >= startOfMonth)
      .reduce((sum, c) => sum + (c.conversion_value ?? 0), 0)

    return NextResponse.json({ total, this_month: thisMonth, count: rows.length })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
