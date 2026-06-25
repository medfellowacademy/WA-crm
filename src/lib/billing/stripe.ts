import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function stripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set')
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-05-28.basil' })
  }
  return _stripe
}
