import Link from 'next/link'
import {
  MessageSquare, Zap, Users, BarChart3, Bot, Shield,
  ChevronRight, CheckCircle2, Star, ArrowRight,
  Webhook, Radio
} from 'lucide-react'

const FEATURES = [
  { icon: MessageSquare, title: 'Unified Inbox', desc: 'All WhatsApp conversations in one place. Assign to agents, add notes, and close chats.' },
  { icon: Radio,           title: 'Bulk Broadcasts', desc: 'Send template messages to thousands of contacts. Server-side queue, no browser needed.' },
  { icon: Zap,            title: 'Automations',    desc: 'Keyword triggers, welcome flows, auto-assign — all without writing code.' },
  { icon: Bot,            title: 'AI Auto-reply',  desc: 'GPT-powered replies that read conversation context and respond intelligently.' },
  { icon: Users,          title: 'Team Inbox',     desc: 'Invite agents, set roles, assign conversations. One number, unlimited agents.' },
  { icon: Webhook,        title: 'Integrations',   desc: 'Zapier webhooks, OpenAI, and a REST API to connect any tool you use.' },
  { icon: BarChart3,      title: 'Analytics',      desc: 'Track messages sent, response times, deal values, and broadcast performance.' },
  { icon: Shield,         title: 'Secure by Design', desc: 'Row-level security, encrypted tokens, HMAC-signed webhooks.' },
]

const TESTIMONIALS = [
  { name: 'Priya S.', role: 'Founder, HealthTech startup', text: 'We went from manually replying to 200 patients a day to automating 80% of it. Game changer.' },
  { name: 'Rajan M.', role: 'Head of Sales, E-commerce', text: 'Broadcast open rates are insane on WhatsApp. We get 90% read rates vs 20% on email.' },
  { name: 'Aisha K.', role: 'Operations, EdTech', text: 'The AI auto-reply handles all off-hours queries. Our response time dropped from 8 hours to seconds.' },
]

const PLANS = [
  { name: 'Free',     price: 0,   period: 'forever', contacts: '100',      messages: '500/mo',    agents: '1',    highlight: false },
  { name: 'Starter',  price: 29,  period: 'month',   contacts: '1,000',    messages: '5,000/mo',  agents: '3',    highlight: false },
  { name: 'Pro',      price: 79,  period: 'month',   contacts: '10,000',   messages: '50,000/mo', agents: '10',   highlight: true  },
  { name: 'Business', price: 199, period: 'month',   contacts: 'Unlimited', messages: 'Unlimited', agents: 'Unlimited', highlight: false },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg">WA CRM</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="/pricing"   className="hover:text-white transition-colors">Pricing</Link>
            <Link href="#testimonials" className="hover:text-white transition-colors">Customers</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login"  className="text-sm text-slate-400 hover:text-white transition-colors hidden sm:block">Sign in</Link>
            <Link href="/signup" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto max-w-4xl relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs text-primary mb-8">
            <Star className="h-3 w-3 fill-current" /> Trusted by 500+ businesses
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            WhatsApp CRM for<br />
            <span className="text-primary">growing businesses</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            Manage all your WhatsApp conversations, send bulk messages, automate replies, and close more deals — all in one platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-white hover:bg-primary/90 transition-colors">
              Start for free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-8 py-4 text-base font-semibold text-slate-300 hover:bg-slate-800 transition-colors">
              View pricing
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">No credit card required · Free plan forever</p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-slate-800">
        <div className="mx-auto max-w-7xl px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '500+',  label: 'Businesses' },
            { value: '2M+',   label: 'Messages sent' },
            { value: '98%',   label: 'Uptime SLA' },
            { value: '< 1s',  label: 'Avg response' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-white">{s.value}</p>
              <p className="text-sm text-slate-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Everything you need to grow on WhatsApp</h2>
            <p className="text-slate-400 max-w-xl mx-auto">One platform to manage conversations, automate outreach, and track results.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 hover:border-slate-700 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 bg-slate-900/40">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Up and running in 5 minutes</h2>
          <p className="text-slate-400 mb-16">No technical setup required. Just connect your WhatsApp Business number and start.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Create your account', desc: 'Sign up free. No credit card required.' },
              { step: '2', title: 'Connect WhatsApp',    desc: 'Paste your Meta API credentials. Takes 3 minutes.' },
              { step: '3', title: 'Start chatting',      desc: 'Invite your team and manage all conversations.' },
            ].map(s => (
              <div key={s.step} className="flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white font-bold text-lg mb-4">{s.step}</div>
                <h3 className="font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-4">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold text-white text-center mb-16">Loved by businesses like yours</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex gap-1 mb-4">
                  {Array.from({length:5}).map((_,i) => <Star key={i} className="h-4 w-4 text-amber-400 fill-current" />)}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                <div>
                  <p className="text-white text-sm font-semibold">{t.name}</p>
                  <p className="text-slate-500 text-xs">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="py-24 px-4 bg-slate-900/40">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Simple, transparent pricing</h2>
          <p className="text-slate-400 mb-12">Start free. Upgrade as you grow.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {PLANS.map(p => (
              <div key={p.name} className={`rounded-xl border p-6 text-left ${p.highlight ? 'border-primary bg-primary/10' : 'border-slate-800 bg-slate-900'}`}>
                {p.highlight && <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Most popular</div>}
                <h3 className="text-white font-bold text-lg">{p.name}</h3>
                <div className="my-3">
                  <span className="text-3xl font-extrabold text-white">${p.price}</span>
                  <span className="text-slate-400 text-sm">/{p.period}</span>
                </div>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />{p.contacts} contacts</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />{p.messages}</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />{p.agents} agent{p.agents === '1' ? '' : 's'}</li>
                </ul>
              </div>
            ))}
          </div>
          <Link href="/pricing" className="inline-flex items-center gap-2 text-primary hover:underline text-sm">
            See full feature comparison <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to grow with WhatsApp?</h2>
          <p className="text-slate-400 mb-8">Join 500+ businesses already using WA CRM to manage customers at scale.</p>
          <Link href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-10 py-4 text-base font-semibold text-white hover:bg-primary/90 transition-colors">
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 text-xs text-slate-500">No credit card · Free forever plan · Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-4">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <MessageSquare className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-bold text-white">WA CRM</span>
            </div>
            <p className="text-sm text-slate-500 max-w-xs">The WhatsApp CRM for modern businesses.</p>
          </div>
          <div className="flex gap-12 text-sm">
            <div className="space-y-3">
              <p className="font-semibold text-slate-300">Product</p>
              <Link href="#features" className="block text-slate-500 hover:text-white transition-colors">Features</Link>
              <Link href="/pricing"  className="block text-slate-500 hover:text-white transition-colors">Pricing</Link>
              <Link href="/login"    className="block text-slate-500 hover:text-white transition-colors">Sign in</Link>
            </div>
            <div className="space-y-3">
              <p className="font-semibold text-slate-300">Legal</p>
              <Link href="/terms"   className="block text-slate-500 hover:text-white transition-colors">Terms</Link>
              <Link href="/privacy" className="block text-slate-500 hover:text-white transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-7xl mt-10 pt-6 border-t border-slate-800 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} WA CRM. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
