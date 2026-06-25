'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Plus, Trash2, Loader2, CheckCircle2, XCircle,
  Star, StarOff, Phone, Copy, ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from '@/components/ui/accordion'

interface WaNumber {
  id: string
  label: string
  phone_number_id: string
  waba_id: string | null
  display_phone: string
  verified_name: string
  is_default: boolean
  is_active: boolean
  status: string
  created_at: string
}

const emptyForm = {
  label: '',
  phone_number_id: '',
  waba_id: '',
  access_token: '',
  verify_token: '',
}

export function WhatsAppNumbers() {
  const [numbers, setNumbers] = useState<WaNumber[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/whatsapp/webhook`
    : ''

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/whatsapp/numbers')
    if (res.ok) {
      const d = await res.json()
      setNumbers(d.numbers ?? [])
    }
    setLoading(false)
  }

  async function handleAdd() {
    if (!form.phone_number_id.trim()) { toast.error('Phone Number ID is required'); return }
    if (!form.access_token.trim()) { toast.error('Access Token is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/whatsapp/numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error ?? 'Failed to add number'); return }
      toast.success(`Connected: ${d.verified_name || d.number?.display_phone || 'Number added'}`)
      setDialogOpen(false)
      setForm(emptyForm)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function setDefault(id: string) {
    setActionId(id)
    const res = await fetch(`/api/whatsapp/numbers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_default: true }),
    })
    if (res.ok) { toast.success('Default number updated'); load() }
    else { const d = await res.json(); toast.error(d.error) }
    setActionId(null)
  }

  async function toggleActive(id: string, current: boolean) {
    setActionId(id)
    const res = await fetch(`/api/whatsapp/numbers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (res.ok) { toast.success(current ? 'Number disabled' : 'Number enabled'); load() }
    setActionId(null)
  }

  async function deleteNumber(id: string) {
    if (!confirm('Remove this WhatsApp number?')) return
    setActionId(id)
    const res = await fetch(`/api/whatsapp/numbers/${id}`, { method: 'DELETE' })
    const d = await res.json()
    if (res.ok) { toast.success('Number removed'); load() }
    else toast.error(d.error)
    setActionId(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  )

  return (
    <div className="space-y-6 mt-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">WhatsApp Numbers</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Connect multiple WhatsApp Business numbers. Each number can receive and send messages independently.
          </p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setDialogOpen(true) }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0">
          <Plus className="size-4" /> Add Number
        </Button>
      </div>

      {/* Webhook URL banner */}
      <div className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 mb-1">Webhook URL — paste this in Meta → WhatsApp → Configuration</p>
          <p className="font-mono text-xs text-slate-200 truncate">{webhookUrl}</p>
        </div>
        <Button variant="outline" size="icon"
          className="shrink-0 h-8 w-8 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
          onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Copied!') }}>
          <Copy className="size-3.5" />
        </Button>
      </div>

      {/* Numbers list */}
      {numbers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-12 text-center">
          <Phone className="size-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">No numbers connected yet</p>
          <p className="text-slate-500 text-xs mt-1">Click &quot;Add Number&quot; to connect your first WhatsApp Business number</p>
        </div>
      ) : (
        <div className="space-y-3">
          {numbers.map(num => (
            <div key={num.id}
              className={`rounded-xl border p-4 flex items-start gap-4 transition-colors
                ${num.is_active ? 'border-slate-700 bg-slate-900' : 'border-slate-800 bg-slate-900/40 opacity-60'}`}>

              {/* Icon */}
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
                ${num.is_active ? 'bg-green-500/10' : 'bg-slate-700/30'}`}>
                <Phone className={`size-5 ${num.is_active ? 'text-green-400' : 'text-slate-500'}`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-white text-sm">{num.label}</span>
                  {num.is_default && (
                    <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Default</Badge>
                  )}
                  {!num.is_active && (
                    <Badge className="text-xs bg-slate-700/50 text-slate-400 border-slate-600">Disabled</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {num.display_phone || num.phone_number_id}
                  {num.verified_name && <span className="text-slate-500"> · {num.verified_name}</span>}
                </p>
                {num.waba_id && (
                  <p className="text-xs text-slate-600 mt-0.5">WABA: {num.waba_id}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {!num.is_default && (
                  <Button variant="ghost" size="icon"
                    className="h-8 w-8 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10"
                    title="Set as default" disabled={actionId === num.id}
                    onClick={() => setDefault(num.id)}>
                    {actionId === num.id ? <Loader2 className="size-3.5 animate-spin" /> : <Star className="size-3.5" />}
                  </Button>
                )}
                <Button variant="ghost" size="icon"
                  className={`h-8 w-8 ${num.is_active
                    ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                    : 'text-slate-600 hover:text-green-400 hover:bg-green-500/10'}`}
                  title={num.is_active ? 'Disable' : 'Enable'}
                  disabled={actionId === num.id}
                  onClick={() => toggleActive(num.id, num.is_active)}>
                  {num.is_active
                    ? <XCircle className="size-3.5" />
                    : <CheckCircle2 className="size-3.5" />}
                </Button>
                <Button variant="ghost" size="icon"
                  className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                  title="Remove" disabled={actionId === num.id || num.is_default}
                  onClick={() => deleteNumber(num.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Number Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Add WhatsApp Number</DialogTitle>
            <DialogDescription className="text-slate-400">
              Connect a WhatsApp Business number from your Meta account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-slate-300">Label <span className="text-slate-500">(optional)</span></Label>
              <Input placeholder="e.g. Support, Sales, Marketing"
                value={form.label}
                onChange={e => setForm({ ...form, label: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Phone Number ID <span className="text-red-400">*</span></Label>
              <Input placeholder="e.g. 100234567890123"
                value={form.phone_number_id}
                onChange={e => setForm({ ...form, phone_number_id: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
              <p className="text-xs text-slate-500">Meta → WhatsApp → API Setup → Phone Number ID</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">WhatsApp Business Account ID <span className="text-slate-500">(optional)</span></Label>
              <Input placeholder="e.g. 100234567890456"
                value={form.waba_id}
                onChange={e => setForm({ ...form, waba_id: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
              <p className="text-xs text-slate-500">Required for template management and syncing</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Permanent Access Token <span className="text-red-400">*</span></Label>
              <Input type="password" placeholder="EAAxxxxxxxxxxxxxxx"
                value={form.access_token}
                onChange={e => setForm({ ...form, access_token: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
              <p className="text-xs text-slate-500">Meta → Business Settings → System Users → Generate Token</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Webhook Verify Token <span className="text-slate-500">(optional)</span></Label>
              <Input placeholder="Any custom string you set in Meta webhook settings"
                value={form.verify_token}
                onChange={e => setForm({ ...form, verify_token: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
            </div>

            {/* Setup help */}
            <Accordion>
              <AccordionItem className="border-slate-700">
                <AccordionTrigger className="text-slate-400 hover:text-slate-300 text-xs hover:no-underline py-2">
                  How to find these values in Meta?
                </AccordionTrigger>
                <AccordionContent className="text-slate-500 text-xs space-y-2">
                  <p><strong className="text-slate-400">Phone Number ID:</strong> developers.facebook.com → Your App → WhatsApp → API Setup</p>
                  <p><strong className="text-slate-400">WABA ID:</strong> Same page, above the Phone Number ID</p>
                  <p><strong className="text-slate-400">Access Token:</strong> Business Settings → System Users → Add System User → Generate Token → select whatsapp_business_messaging + whatsapp_business_management</p>
                  <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:text-primary/80">
                    <ExternalLink className="size-3" /> Full documentation
                  </a>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800">
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {saving ? <><Loader2 className="size-4 animate-spin" /> Connecting…</> : 'Connect Number'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
