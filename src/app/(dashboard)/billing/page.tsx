'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Zap, CreditCard, ArrowUpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { PLANS, type PlanId, isUnlimited } from '@/lib/billing/plans'

interface UsageData {
  plan: string
  subscription_status: string
  limits: { contacts: number; messages: number; broadcasts: number; automations: number; agents: number }
  usage:  { contacts: number; messages: number; broadcasts: number; agents: number }
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = isUnlimited(limit)
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100))
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-primary'

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400">
          {used.toLocaleString()} / {unlimited ? '∞' : limit.toLocaleString()}
        </span>
      </div>
      {!unlimited && (
        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      {unlimited && <div className="h-2 rounded-full bg-primary/20" />}
    </div>
  )
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free', starter: 'Starter', pro: 'Pro', business: 'Business'
}
const PLAN_COLORS: Record<string, string> = {
  free: 'bg-slate-700/50 text-slate-300 border-slate-600',
  starter: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  pro: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  business: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

export default function BillingPage() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState<string | null>(null)
  const [openingPortal, setOpeningPortal] = useState(false)

  useEffect(() => {
    if (searchParams.get('success')) toast.success('Subscription activated! Your plan has been upgraded.')
    if (searchParams.get('canceled')) toast.info('Checkout canceled.')
  }, [searchParams])

  useEffect(() => {
    fetch('/api/billing/usage').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  async function upgrade(plan: PlanId) {
    setCheckingOut(plan)
    const res = await fetch('/api/billing/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    const d = await res.json()
    if (d.url) window.location.href = d.url
    else { toast.error(d.error ?? 'Failed'); setCheckingOut(null) }
  }

  async function openPortal() {
    setOpeningPortal(true)
    const res = await fetch('/api/billing/portal', { method: 'POST' })
    const d = await res.json()
    if (d.url) window.location.href = d.url
    else { toast.error('No billing account found. Subscribe to a paid plan first.'); setOpeningPortal(false) }
  }

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-slate-800 rounded-lg animate-pulse" />
      <div className="h-40 bg-slate-800 rounded-xl animate-pulse" />
      <div className="h-64 bg-slate-800 rounded-xl animate-pulse" />
    </div>
  )

  const currentPlan = data?.plan ?? 'free'
  const isPaid = currentPlan !== 'free'

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Billing & Usage</h1>
        <p className="text-sm text-slate-400 mt-1">Manage your plan, view usage, and upgrade anytime.</p>
      </div>

      {/* Current plan card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-semibold text-white">Current Plan</h2>
              <Badge className={`text-xs border ${PLAN_COLORS[currentPlan]}`}>
                {PLAN_LABELS[currentPlan] ?? currentPlan}
              </Badge>
              {data?.subscription_status === 'active' && (
                <Badge className="text-xs bg-green-500/10 text-green-400 border-green-500/20">Active</Badge>
              )}
              {data?.subscription_status === 'past_due' && (
                <Badge className="text-xs bg-red-500/10 text-red-400 border-red-500/20">Payment failed</Badge>
              )}
            </div>
            <p className="text-sm text-slate-400">
              {currentPlan === 'free'
                ? 'Free plan — upgrade to unlock more contacts, messages, and team members.'
                : `$${PLANS[currentPlan as PlanId]?.price ?? 0}/month`}
            </p>
          </div>
          {isPaid && (
            <Button variant="outline" size="sm" onClick={openPortal} disabled={openingPortal}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 shrink-0">
              <CreditCard className="h-3.5 w-3.5 mr-1.5" />
              {openingPortal ? 'Opening…' : 'Manage billing'}
            </Button>
          )}
        </div>

        {/* Usage bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <UsageBar label="Messages this month" used={data?.usage.messages ?? 0}  limit={data?.limits.messages ?? 500} />
          <UsageBar label="Contacts"             used={data?.usage.contacts ?? 0}  limit={data?.limits.contacts ?? 100} />
          <UsageBar label="Broadcasts this month" used={data?.usage.broadcasts ?? 0} limit={data?.limits.broadcasts ?? 2} />
          <UsageBar label="Team members"         used={data?.usage.agents ?? 0}   limit={data?.limits.agents ?? 1} />
        </div>
      </div>

      {/* Plan cards */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          {isPaid ? 'Change plan' : 'Upgrade your plan'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['starter','pro','business'] as PlanId[]).map(planId => {
            const plan = PLANS[planId]
            const isCurrent = currentPlan === planId
            return (
              <div key={planId}
                className={`rounded-xl border p-5 flex flex-col ${planId === 'pro' ? 'border-primary bg-primary/5' : 'border-slate-800 bg-slate-900'}`}>
                {planId === 'pro' && <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Most popular</p>}
                <h3 className="font-bold text-white text-lg">{plan.name}</h3>
                <div className="my-2">
                  <span className="text-2xl font-extrabold text-white">${plan.price}</span>
                  <span className="text-slate-400 text-xs ml-1">/month</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-400 flex-1 mb-4">
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />{isUnlimited(plan.contacts) ? 'Unlimited' : plan.contacts.toLocaleString()} contacts</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />{isUnlimited(plan.messages) ? 'Unlimited' : plan.messages.toLocaleString()} messages/mo</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />{isUnlimited(plan.agents) ? 'Unlimited' : plan.agents} agents</li>
                  {plan.ai_reply && <li className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-violet-400 shrink-0" />AI auto-reply</li>}
                </ul>
                <Button
                  disabled={isCurrent || checkingOut === planId}
                  onClick={() => upgrade(planId)}
                  className={`w-full h-9 text-sm ${planId === 'pro'
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'border border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800'}`}>
                  {isCurrent ? 'Current plan' : checkingOut === planId ? 'Redirecting…' : (
                    <><ArrowUpCircle className="h-3.5 w-3.5 mr-1.5" />Upgrade to {plan.name}</>
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
