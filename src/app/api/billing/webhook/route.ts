import { NextResponse } from 'next/server'
import { stripe } from '@/lib/billing/stripe'
import { adminClient } from '@/lib/org'
import type Stripe from 'stripe'

// App Router reads the raw body via request.text() (needed for Stripe
// signature verification), so no bodyParser config is required here.

async function updateOrgSubscription(sub: Stripe.Subscription, planOverride?: string) {
  const orgId = sub.metadata?.org_id
  if (!orgId) return

  const plan = planOverride ?? sub.metadata?.plan ?? 'free'
  const db = adminClient()

  // In the 2026-06-24 (dahlia) API the billing period moved off the
  // Subscription onto each SubscriptionItem, so read it from the first item.
  const period = sub.items?.data?.[0]
  const periodStart = period?.current_period_start ?? 0
  const periodEnd   = period?.current_period_end   ?? 0

  await db.from('organizations').update({
    stripe_subscription_id: sub.id,
    subscription_status:    sub.status,
    plan,
    plan_period_start: new Date(periodStart * 1000).toISOString(),
    plan_period_end:   new Date(periodEnd   * 1000).toISOString(),
  }).eq('id', orgId)
}

export async function POST(request: Request) {
  const body = await request.text()
  const sig  = request.headers.get('stripe-signature') ?? ''
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe().webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('[stripe webhook] signature failed', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription' && session.subscription) {
          const sub = await stripe().subscriptions.retrieve(session.subscription as string)
          await updateOrgSubscription(sub, session.metadata?.plan)
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const plan = event.type === 'customer.subscription.deleted' ? 'free' : undefined
        await updateOrgSubscription(sub, plan)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        // dahlia API: the subscription link moved under parent.subscription_details.
        const subRef = invoice.parent?.subscription_details?.subscription
        const subId = typeof subRef === 'string' ? subRef : subRef?.id
        if (subId) {
          const sub = await stripe().subscriptions.retrieve(subId)
          const orgId = sub.metadata?.org_id
          if (orgId) {
            await adminClient().from('organizations')
              .update({ subscription_status: 'past_due' }).eq('id', orgId)
          }
        }
        break
      }
    }
  } catch (err) {
    console.error('[stripe webhook] handler error', err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
