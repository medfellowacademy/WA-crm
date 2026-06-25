import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrg, adminClient } from '@/lib/org'
import { stripe } from '@/lib/billing/stripe'
import { PLANS, type PlanId } from '@/lib/billing/plans'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { plan } = await request.json() as { plan: PlanId }
    const planConfig = PLANS[plan]
    if (!planConfig || !planConfig.stripePriceId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const { org } = await getCurrentOrg()
    const db = adminClient()

    // Get or create Stripe customer
    let customerId = org.stripe_customer_id as string | undefined
    if (!customerId) {
      const customer = await stripe().customers.create({
        email: user.email,
        name:  org.name,
        metadata: { org_id: org.id, user_id: user.id },
      })
      customerId = customer.id
      await db.from('organizations').update({ stripe_customer_id: customerId }).eq('id', org.id)
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

    const session = await stripe().checkout.sessions.create({
      customer:   customerId,
      mode:       'subscription',
      line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
      success_url: `${siteUrl}/dashboard/billing?success=1`,
      cancel_url:  `${siteUrl}/dashboard/billing?canceled=1`,
      metadata:    { org_id: org.id, plan },
      subscription_data: { metadata: { org_id: org.id, plan } },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[billing/checkout]', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
