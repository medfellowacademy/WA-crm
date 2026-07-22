import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrg, adminClient } from '@/lib/org'
import { generateApiKey } from '@/lib/api/auth'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { org } = await getCurrentOrg()

    const { data } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, scopes, last_used_at, created_at')
      .eq('org_id', org.id)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })

    return NextResponse.json({ keys: data ?? [] })
  } catch (err) {
    console.error('[integrations/api-keys GET]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { org } = await getCurrentOrg()

    const { name, scopes } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const validScopes = Array.isArray(scopes)
      ? scopes.filter((s: string) => s === 'read' || s === 'write')
      : ['read', 'write']

    const key = generateApiKey()

    const { data, error: insertErr } = await adminClient()
      .from('api_keys')
      .insert({
        org_id: org.id,
        name: name.trim(),
        key_prefix: key.prefix,
        key_hash: key.hash,
        scopes: validScopes.length ? validScopes : ['read'],
        created_by: user.id,
      })
      .select('id, name, key_prefix, scopes, created_at')
      .single()

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

    // The plaintext is returned exactly once — the client must copy it now.
    return NextResponse.json({ key: data, plaintext: key.plaintext }, { status: 201 })
  } catch (err) {
    console.error('[integrations/api-keys POST]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
