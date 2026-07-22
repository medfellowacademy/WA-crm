import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export interface OrgMember {
  id: string
  org_id: string
  user_id: string | null
  email: string
  role: 'owner' | 'admin' | 'member'
  accepted_at: string | null
  created_at: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  owner_id: string
  plan: 'free' | 'starter' | 'pro' | 'business'
  created_at: string
  // White label (migration 026)
  logo_url?: string | null
  app_name?: string | null
  // SLA settings (migration 025)
  sla_settings?: { first_response_minutes: number; resolution_hours: number } | null
  // Billing / Stripe
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  subscription_status?: string | null
  plan_period_start?: string | null
  plan_period_end?: string | null
}

/**
 * Returns the current user's primary org and their membership row.
 * Throws if the user is not authenticated or has no org.
 */
export async function getCurrentOrg(): Promise<{
  org: Organization
  member: OrgMember
  userId: string
}> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) throw new Error('Unauthorized')

  const { data: member, error: memberErr } = await supabase
    .from('org_members')
    .select('*, org:organizations(*)')
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (memberErr || !member) throw new Error('No organization found for user')

  return {
    org: member.org as Organization,
    member: member as OrgMember,
    userId: user.id,
  }
}

/**
 * Resolves org_id for a given user_id using the admin client.
 * Used in webhook/cron routes that don't have a Supabase session.
 */
export function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function getOrgIdForUser(userId: string): Promise<string | null> {
  const db = adminClient()
  const { data } = await db
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .not('accepted_at', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  return data?.org_id ?? null
}
