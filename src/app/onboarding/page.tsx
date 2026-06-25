'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Building2, MessageSquare, Users, CheckCircle,
  ArrowRight, Copy, Loader2, Zap,
} from 'lucide-react'
import { toast } from 'sonner'

const STEPS = [
  { id: 'org',       label: 'Your workspace', icon: Building2 },
  { id: 'whatsapp',  label: 'Connect WhatsApp', icon: MessageSquare },
  { id: 'team',      label: 'Invite team', icon: Users },
] as const

type StepId = typeof STEPS[number]['id']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<StepId>('org')
  const [completing, setCompleting] = useState(false)

  // Step 1 state
  const [orgName, setOrgName] = useState('')
  const [savingOrg, setSavingOrg] = useState(false)

  // Step 2 state
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [accessToken, setAccessToken]     = useState('')
  const [verifyToken, setVerifyToken]     = useState('')
  const [wabaId, setWabaId]               = useState('')
  const [savingWA, setSavingWA]           = useState(false)
  const [webhookUrl, setWebhookUrl]       = useState(
    typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp/webhook` : ''
  )

  // Step 3 state
  const [inviteEmail, setInviteEmail]   = useState('')
  const [inviting, setInviting]         = useState(false)
  const [invitedCount, setInvitedCount] = useState(0)

  const currentIndex = STEPS.findIndex(s => s.id === step)

  async function saveOrg(e: React.FormEvent) {
    e.preventDefault()
    if (!orgName.trim()) return
    setSavingOrg(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: member } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', user.id)
        .not('accepted_at', 'is', null)
        .single()

      if (member) {
        await supabase
          .from('organizations')
          .update({ name: orgName.trim() })
          .eq('id', member.org_id)
      }
      setStep('whatsapp')
    } finally {
      setSavingOrg(false)
    }
  }

  async function saveWhatsApp(e: React.FormEvent) {
    e.preventDefault()
    if (!phoneNumberId || !accessToken) return
    setSavingWA(true)
    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number_id: phoneNumberId,
          access_token:    accessToken,
          verify_token:    verifyToken,
          waba_id:         wabaId,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error ?? 'Failed to save WhatsApp config')
        return
      }
      setStep('team')
    } finally {
      setSavingWA(false)
    }
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail) return
    setInviting(true)
    try {
      const res = await fetch('/api/org/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: 'member' }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error); return }
      await navigator.clipboard.writeText(d.invite_url)
      toast.success('Invite link copied!')
      setInviteEmail('')
      setInvitedCount(c => c + 1)
    } finally {
      setInviting(false)
    }
  }

  async function finish() {
    setCompleting(true)
    await fetch('/api/org/complete-onboarding', { method: 'POST' })
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <span className="text-lg font-bold text-white">WaCRM</span>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map((s, i) => {
          const done = i < currentIndex
          const active = s.id === step
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors
                ${done   ? 'bg-primary text-primary-foreground' :
                  active ? 'bg-primary/20 text-primary ring-2 ring-primary' :
                           'bg-slate-800 text-slate-500'}`}
              >
                {done ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`hidden sm:block text-sm ${active ? 'text-white font-medium' : 'text-slate-500'}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`mx-1 h-px w-8 ${i < currentIndex ? 'bg-primary' : 'bg-slate-800'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Cards */}
      <div className="w-full max-w-lg">

        {/* ── Step 1: Org name ── */}
        {step === 'org' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-white">Name your workspace</h1>
              <p className="text-slate-400 text-sm">This is how your team will recognise it.</p>
            </div>
            <form onSubmit={saveOrg} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName" className="text-slate-300">Workspace name</Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  placeholder="Acme Support Team"
                  required
                  autoFocus
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                />
              </div>
              <Button type="submit" disabled={savingOrg || !orgName.trim()} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                {savingOrg ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </form>
          </div>
        )}

        {/* ── Step 2: WhatsApp ── */}
        {step === 'whatsapp' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-white">Connect WhatsApp</h1>
              <p className="text-slate-400 text-sm">
                Enter your Meta Cloud API credentials. You can find these in the{' '}
                <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Meta Developer Portal
                </a>.
              </p>
            </div>

            {/* Webhook URL copy */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-2">
              <p className="text-xs font-medium text-slate-400">Your webhook URL (paste into Meta)</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-slate-300 break-all">{webhookUrl}</code>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Copied!') }}
                  className="shrink-0 p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <form onSubmit={saveWhatsApp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phoneId" className="text-slate-300">Phone Number ID</Label>
                <Input id="phoneId" value={phoneNumberId} onChange={e => setPhoneNumberId(e.target.value)}
                  placeholder="1234567890" required
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wabaId" className="text-slate-300">WhatsApp Business Account ID</Label>
                <Input id="wabaId" value={wabaId} onChange={e => setWabaId(e.target.value)}
                  placeholder="Optional"
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accessToken" className="text-slate-300">Access Token</Label>
                <Input id="accessToken" type="password" value={accessToken} onChange={e => setAccessToken(e.target.value)}
                  placeholder="EAAxxxxxx…" required
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="verifyToken" className="text-slate-300">Verify Token</Label>
                <Input id="verifyToken" value={verifyToken} onChange={e => setVerifyToken(e.target.value)}
                  placeholder="A random string you set in Meta"
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500" />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep('team')}
                  className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800">
                  Skip for now
                </Button>
                <Button type="submit" disabled={savingWA || !phoneNumberId || !accessToken}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                  {savingWA ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save & continue <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── Step 3: Invite team ── */}
        {step === 'team' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-white">Invite your team</h1>
              <p className="text-slate-400 text-sm">Add colleagues so you can handle conversations together.</p>
            </div>

            {invitedCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                <CheckCircle className="h-4 w-4 shrink-0" />
                {invitedCount} invite{invitedCount > 1 ? 's' : ''} sent
              </div>
            )}

            <form onSubmit={sendInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteEmail" className="text-slate-300">Email address</Label>
                <div className="flex gap-2">
                  <Input
                    id="inviteEmail"
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                  />
                  <Button type="submit" disabled={inviting || !inviteEmail}
                    className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90">
                    {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">Generates a link — copy it and share manually.</p>
              </div>
            </form>

            <Button onClick={finish} disabled={completing}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              {completing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Go to dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
