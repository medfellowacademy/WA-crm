import { NextResponse } from 'next/server'
import { getCurrentOrg, adminClient } from '@/lib/org'

/**
 * POST /api/onboarding/demo-data — seeds a handful of sample contacts so a
 * brand-new user can try a broadcast immediately (drives TTFSM down). Tagged
 * `source: demo` so it's easy to spot and clean up.
 */
const DEMO_CONTACTS = [
  { name: 'Demo — Aisha Khan', phone: '15550100001', email: 'aisha@example.com', company: 'Acme Co' },
  { name: 'Demo — Marco Rossi', phone: '15550100002', email: 'marco@example.com', company: 'Bright Labs' },
  { name: 'Demo — Priya Nair', phone: '15550100003', email: 'priya@example.com', company: 'Nair & Sons' },
  { name: 'Demo — James Park', phone: '15550100004', email: 'james@example.com', company: 'Parkside' },
  { name: 'Demo — Lina Müller', phone: '15550100005', email: 'lina@example.com', company: 'Müller GmbH' },
]

export async function POST() {
  try {
    const { org, userId } = await getCurrentOrg()
    const db = adminClient()

    const rows = DEMO_CONTACTS.map((c) => ({
      org_id: org.id,
      user_id: userId,
      phone: c.phone,
      name: c.name,
      email: c.email,
      company: c.company,
      source: 'demo',
    }))

    // Skip any demo numbers already present so re-running is idempotent.
    const { data: existing } = await db
      .from('contacts')
      .select('phone')
      .eq('org_id', org.id)
      .in('phone', DEMO_CONTACTS.map((c) => c.phone))
    const have = new Set((existing ?? []).map((r: { phone: string }) => r.phone))
    const toInsert = rows.filter((r) => !have.has(r.phone))

    if (toInsert.length > 0) {
      const { error } = await db.from('contacts').insert(toInsert)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, added: toInsert.length })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

/** DELETE — remove the demo contacts again. */
export async function DELETE() {
  try {
    const { org } = await getCurrentOrg()
    await adminClient().from('contacts').delete().eq('org_id', org.id).eq('source', 'demo')
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
