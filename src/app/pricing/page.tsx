import Link from 'next/link'
import { CheckCircle2, X, MessageSquare } from 'lucide-react'

const PLANS = [
  {
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'For individuals just getting started',
    cta: 'Start free',
    ctaHref: '/signup',
    highlight: false,
    features: {
      contacts: '100',
      messages: '500 / month',
      broadcasts: '2 / month',
      automations: '1',
      agents: '1',
      ai_reply: false,
      webhooks: false,
      api_access: false,
      support: 'Community',
    },
  },
  {
    name: 'Starter',
    price: 29,
    period: 'month',
    description: 'For small teams starting to scale',
    cta: 'Get started',
    ctaHref: '/signup?plan=starter',
    highlight: false,
    features: {
      contacts: '1,000',
      messages: '5,000 / month',
      broadcasts: '10 / month',
      automations: '5',
      agents: '3',
      ai_reply: false,
      webhooks: true,
      api_access: false,
      support: 'Email',
    },
  },
  {
    name: 'Pro',
    price: 79,
    period: 'month',
    description: 'For growing businesses at scale',
    cta: 'Get started',
    ctaHref: '/signup?plan=pro',
    highlight: true,
    features: {
      contacts: '10,000',
      messages: '50,000 / month',
      broadcasts: 'Unlimited',
      automations: 'Unlimited',
      agents: '10',
      ai_reply: true,
      webhooks: true,
      api_access: true,
      support: 'Priority email',
    },
  },
  {
    name: 'Business',
    price: 199,
    period: 'month',
    description: 'For large teams with high volume',
    cta: 'Get started',
    ctaHref: '/signup?plan=business',
    highlight: false,
    features: {
      contacts: 'Unlimited',
      messages: 'Unlimited',
      broadcasts: 'Unlimited',
      automations: 'Unlimited',
      agents: 'Unlimited',
      ai_reply: true,
      webhooks: true,
      api_access: true,
      support: 'Dedicated support',
    },
  },
]

const ROWS: { key: keyof typeof PLANS[0]['features']; label: string }[] = [
  { key: 'contacts',    label: 'Contacts' },
  { key: 'messages',    label: 'Messages / month' },
  { key: 'broadcasts',  label: 'Broadcasts' },
  { key: 'automations', label: 'Automations' },
  { key: 'agents',      label: 'Team agents' },
  { key: 'ai_reply',    label: 'AI auto-reply (GPT)' },
  { key: 'webhooks',    label: 'Zapier / Webhooks' },
  { key: 'api_access',  label: 'API access' },
  { key: 'support',     label: 'Support' },
]

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') {
    return value
      ? <CheckCircle2 className="h-5 w-5 text-green-400 mx-auto" />
      : <X className="h-5 w-5 text-slate-600 mx-auto" />
  }
  return <span className="text-sm text-slate-300">{value}</span>
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg">WA CRM</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login"  className="text-sm text-slate-400 hover:text-white transition-colors">Sign in</Link>
            <Link href="/signup" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">Start free</Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="py-20 px-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">Simple, transparent pricing</h1>
        <p className="text-slate-400 max-w-xl mx-auto text-lg">Start free. Upgrade as you grow. No hidden fees.</p>
      </section>

      {/* Cards */}
      <section className="px-4 pb-16">
        <div className="mx-auto max-w-7xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map(plan => (
            <div key={plan.name}
              className={`rounded-2xl border p-6 flex flex-col ${plan.highlight ? 'border-primary bg-primary/10' : 'border-slate-800 bg-slate-900'}`}>
              {plan.highlight && (
                <div className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Most popular</div>
              )}
              <h2 className="text-xl font-bold text-white">{plan.name}</h2>
              <p className="text-sm text-slate-400 mt-1 mb-4">{plan.description}</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-white">${plan.price}</span>
                <span className="text-slate-400 text-sm ml-1">/{plan.period}</span>
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {ROWS.map(row => (
                  <li key={row.key} className="flex items-start gap-2 text-sm text-slate-300">
                    {typeof plan.features[row.key] === 'boolean'
                      ? plan.features[row.key]
                        ? <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                        : <X className="h-4 w-4 text-slate-600 mt-0.5 shrink-0" />
                      : <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    }
                    <span>
                      {typeof plan.features[row.key] === 'boolean'
                        ? row.label
                        : `${plan.features[row.key]} ${row.label.toLowerCase()}`}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href={plan.ctaHref}
                className={`block text-center rounded-xl py-3 text-sm font-semibold transition-colors ${
                  plan.highlight
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section className="px-4 pb-24">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-bold text-white text-center mb-10">Full feature comparison</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="py-4 px-6 text-left text-slate-400 font-medium">Feature</th>
                  {PLANS.map(p => (
                    <th key={p.name} className={`py-4 px-4 text-center font-bold ${p.highlight ? 'text-primary' : 'text-white'}`}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, i) => (
                  <tr key={row.key} className={`border-b border-slate-800/60 ${i % 2 === 0 ? 'bg-slate-900/20' : ''}`}>
                    <td className="py-3.5 px-6 text-slate-300">{row.label}</td>
                    {PLANS.map(p => (
                      <td key={p.name} className="py-3.5 px-4 text-center">
                        <Cell value={p.features[row.key]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 pb-24 bg-slate-900/40 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-white text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-6">
            {[
              { q: 'Do I need a WhatsApp Business API account?', a: 'Yes. You need a Meta Business account with WhatsApp Business API access. We guide you through setup in our onboarding wizard.' },
              { q: 'What counts as a "message"?', a: 'Each message your team sends through the platform counts. Incoming messages from customers are free and unlimited.' },
              { q: 'Can I change plans anytime?', a: 'Yes. Upgrade or downgrade at any time. Upgrades are prorated immediately. Downgrades take effect at the next billing cycle.' },
              { q: 'Is there a free trial for paid plans?', a: 'The Free plan is available forever. Paid plans can be cancelled anytime — no long-term commitment.' },
              { q: 'What happens when I hit my limit?', a: 'We show a warning at 80% usage. At 100% you will need to upgrade to continue sending. We never delete your data.' },
            ].map(faq => (
              <div key={faq.q} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <h3 className="font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-sm text-slate-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Start for free today</h2>
        <p className="text-slate-400 mb-8">No credit card required. Upgrade when you&apos;re ready.</p>
        <Link href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-white hover:bg-primary/90">
          Create free account
        </Link>
      </section>

      <footer className="border-t border-slate-800 py-8 px-4 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} WA CRM · <Link href="/terms" className="hover:text-slate-400">Terms</Link> · <Link href="/privacy" className="hover:text-slate-400">Privacy</Link>
      </footer>
    </div>
  )
}
