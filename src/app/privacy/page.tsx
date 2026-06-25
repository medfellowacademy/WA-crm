import Link from 'next/link'
import { MessageSquare } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-slate-800 py-4 px-6">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <MessageSquare className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-white">WA CRM</span>
        </Link>
      </nav>
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-slate-400 text-sm mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</p>
        <div className="space-y-8 text-slate-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Information We Collect</h2>
            <p>We collect: account information (name, email, password); organization data; WhatsApp Business API credentials (encrypted at rest); contact data you import; message logs; usage metrics; billing information (via Stripe — we never store card numbers).</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. How We Use Your Information</h2>
            <p>We use your data to: provide and improve the Service; process payments; send service notifications; enforce our Terms; comply with legal obligations. We do not sell your data.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Data Storage and Security</h2>
            <p>Data is stored on Supabase (PostgreSQL) with row-level security. WhatsApp tokens are encrypted with AES-256-GCM. We use HTTPS everywhere. We follow industry-standard security practices.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Third-Party Services</h2>
            <p>We use: <strong className="text-white">Supabase</strong> (database/auth), <strong className="text-white">Stripe</strong> (payments), <strong className="text-white">Meta/WhatsApp</strong> (messaging API), <strong className="text-white">OpenAI</strong> (optional AI features), <strong className="text-white">Vercel</strong> (hosting). Each has its own privacy policy.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Your Rights</h2>
            <p>You may: access, update, or delete your data at any time; export your contacts and message history; cancel your account and request data deletion. Contact us to exercise these rights.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Customer Data</h2>
            <p>Your customers' contact information and messages belong to you. We process this data only to provide the Service. We do not use your customers' data for any other purpose.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Cookies</h2>
            <p>We use session cookies for authentication only. We do not use tracking or advertising cookies.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Data Retention</h2>
            <p>We retain your data for the duration of your subscription plus 30 days after cancellation. You may request immediate deletion at any time.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Contact</h2>
            <p>Privacy questions: <a href="mailto:privacy@wacrm.app" className="text-primary hover:underline">privacy@wacrm.app</a></p>
          </section>
        </div>
      </div>
    </div>
  )
}
