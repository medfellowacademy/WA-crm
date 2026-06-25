import Link from 'next/link'
import { MessageSquare } from 'lucide-react'

export default function TermsPage() {
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
      <div className="mx-auto max-w-3xl px-4 py-16 prose prose-invert prose-slate">
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-slate-400 text-sm mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</p>
        <div className="space-y-8 text-slate-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using WA CRM ("Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Description of Service</h2>
            <p>WA CRM is a WhatsApp Business CRM platform that allows businesses to manage customer conversations, send broadcasts, and automate messaging through the WhatsApp Business API.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Eligibility</h2>
            <p>You must be at least 18 years old and have a valid WhatsApp Business API account from Meta Platforms, Inc. You are responsible for compliance with Meta's Terms of Service.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Account Responsibilities</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials. You are responsible for all activity under your account. Notify us immediately of any unauthorized use.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Acceptable Use</h2>
            <p>You agree not to use the Service to: send spam or unsolicited messages; violate any applicable laws; infringe on intellectual property rights; transmit malware or harmful code; abuse, harass, or threaten any person.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Billing and Payments</h2>
            <p>Paid plans are billed monthly or annually. Payments are processed via Stripe. You may cancel at any time. Refunds are provided at our discretion for unused portions of annual plans.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Data and Privacy</h2>
            <p>We collect and process data as described in our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. Your customer data is your property. We do not sell your data to third parties.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, WA CRM is not liable for any indirect, incidental, or consequential damages arising from your use of the Service.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Termination</h2>
            <p>We reserve the right to suspend or terminate accounts that violate these Terms. You may cancel your account at any time from the billing settings page.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Changes to Terms</h2>
            <p>We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance. We will notify you via email for material changes.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Contact</h2>
            <p>Questions? Contact us at <a href="mailto:support@wacrm.app" className="text-primary hover:underline">support@wacrm.app</a></p>
          </section>
        </div>
      </div>
    </div>
  )
}
