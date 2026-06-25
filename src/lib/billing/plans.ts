export type PlanId = 'free' | 'starter' | 'pro' | 'business'

export interface PlanLimits {
  contacts:    number   // -1 = unlimited
  messages:    number
  broadcasts:  number
  automations: number
  agents:      number
  ai_reply:    boolean
  webhooks:    boolean
}

export const PLANS: Record<PlanId, PlanLimits & { name: string; price: number; stripePriceId: string | null }> = {
  free: {
    name: 'Free', price: 0, stripePriceId: null,
    contacts: 100, messages: 500, broadcasts: 2, automations: 1, agents: 1,
    ai_reply: false, webhooks: false,
  },
  starter: {
    name: 'Starter', price: 29, stripePriceId: process.env.STRIPE_PRICE_STARTER ?? '',
    contacts: 1000, messages: 5000, broadcasts: 10, automations: 5, agents: 3,
    ai_reply: false, webhooks: true,
  },
  pro: {
    name: 'Pro', price: 79, stripePriceId: process.env.STRIPE_PRICE_PRO ?? '',
    contacts: 10000, messages: 50000, broadcasts: -1, automations: -1, agents: 10,
    ai_reply: true, webhooks: true,
  },
  business: {
    name: 'Business', price: 199, stripePriceId: process.env.STRIPE_PRICE_BUSINESS ?? '',
    contacts: -1, messages: -1, broadcasts: -1, automations: -1, agents: -1,
    ai_reply: true, webhooks: true,
  },
}

export function getPlan(planId: string): PlanLimits & { name: string; price: number } {
  return PLANS[(planId as PlanId) ?? 'free'] ?? PLANS.free
}

export function isUnlimited(val: number) { return val === -1 }

export function withinLimit(used: number, limit: number) {
  if (limit === -1) return true
  return used < limit
}
