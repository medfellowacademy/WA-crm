'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Plus, Zap, Bot, ExternalLink, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

const ALL_EVENTS = [
  { id: 'new_message',           label: 'New message received' },
  { id: 'new_contact',           label: 'New contact created' },
  { id: 'conversation_opened',   label: 'Conversation opened' },
  { id: 'conversation_closed',   label: 'Conversation closed' },
  { id: 'deal_created',          label: 'Deal created' },
  { id: 'deal_updated',          label: 'Deal updated' },
  { id: 'broadcast_sent',        label: 'Broadcast sent' },
]

interface WebhookEndpoint {
  id: string
  name: string
  url: string
  events: string[]
  is_active: boolean
  last_fired_at: string | null
  last_status: number | null
}

// ── Webhook section ──────────────────────────────────────────
function WebhooksSection() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([])
  const [loading, setLoading]     = useState(true)
  const [adding, setAdding]       = useState(false)

  // new endpoint form
  const [name, setName]     = useState('')
  const [url, setUrl]       = useState('')
  const [secret, setSecret] = useState('')
  const [events, setEvents] = useState<string[]>(['new_message'])
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/integrations/webhooks')
    const d = await res.json()
    setEndpoints(d.endpoints ?? [])
    setLoading(false)
  }

  function toggleEvent(id: string) {
    setEvents(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id])
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !url || events.length === 0) { toast.error('Fill in all fields and select at least one event'); return }
    setSaving(true)
    const res = await fetch('/api/integrations/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url, secret: secret || undefined, events }),
    })
    if (res.ok) {
      toast.success('Webhook added')
      setName(''); setUrl(''); setSecret(''); setEvents(['new_message'])
      setAdding(false)
      load()
    } else {
      const d = await res.json(); toast.error(d.error)
    }
    setSaving(false)
  }

  async function toggleActive(ep: WebhookEndpoint) {
    await fetch(`/api/integrations/webhooks/${ep.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !ep.is_active }),
    })
    load()
  }

  async function remove(id: string) {
    await fetch(`/api/integrations/webhooks/${id}`, { method: 'DELETE' })
    toast.success('Webhook deleted')
    load()
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-white">Outbound Webhooks</h3>
        </div>
        <Button size="sm" onClick={() => setAdding(v => !v)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-8">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add webhook
        </Button>
      </div>
      <p className="text-sm text-slate-400">
        POST a JSON payload to your URL whenever an event happens. Use with{' '}
        <a href="https://zapier.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
          Zapier <ExternalLink className="h-3 w-3" />
        </a>{' '}
        or any custom integration.
      </p>

      {/* Add form */}
      {adding && (
        <form onSubmit={create} className="rounded-lg border border-slate-700 bg-slate-800/60 p-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Zapier → Slack"
                required className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Endpoint URL</Label>
              <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://hooks.zapier.com/…"
                required type="url" className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 h-8 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Signing Secret <span className="text-slate-500">(optional)</span></Label>
            <Input value={secret} onChange={e => setSecret(e.target.value)} placeholder="Random secret for HMAC verification"
              type="password" className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 h-8 text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300 text-xs">Events to subscribe</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_EVENTS.map(ev => (
                <button key={ev.id} type="button" onClick={() => toggleEvent(ev.id)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    events.includes(ev.id)
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                  }`}>
                  {ev.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setAdding(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 h-8">Cancel</Button>
            <Button type="submit" size="sm" disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-8">
              {saving ? 'Saving…' : 'Save webhook'}
            </Button>
          </div>
        </form>
      )}

      {/* Endpoint list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2].map(i => <div key={i} className="h-12 rounded-lg bg-slate-800/60 animate-pulse" />)}
        </div>
      ) : endpoints.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">No webhooks yet.</p>
      ) : (
        <div className="space-y-2">
          {endpoints.map(ep => (
            <div key={ep.id} className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/40 px-4 py-3">
              <Switch checked={ep.is_active} onCheckedChange={() => toggleActive(ep)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{ep.name}</p>
                <p className="text-xs text-slate-500 truncate">{ep.url}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {ep.last_status && (
                  ep.last_status < 300
                    ? <CheckCircle2 className="h-4 w-4 text-green-400" />
                    : <XCircle className="h-4 w-4 text-red-400" />
                )}
                <div className="flex flex-wrap gap-1 max-w-40 hidden sm:flex">
                  {ep.events.slice(0, 2).map(ev => (
                    <Badge key={ev} className="text-xs bg-slate-700/60 text-slate-300 border-slate-600 px-1.5 py-0">
                      {ev.replace('_', ' ')}
                    </Badge>
                  ))}
                  {ep.events.length > 2 && (
                    <Badge className="text-xs bg-slate-700/60 text-slate-300 border-slate-600 px-1.5 py-0">
                      +{ep.events.length - 2}
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(ep.id)}
                  className="h-7 w-7 text-slate-500 hover:text-red-400 hover:bg-red-500/10">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── OpenAI section ───────────────────────────────────────────
const OPENAI_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (fast, cheap)' },
  { value: 'gpt-4o',      label: 'GPT-4o (best quality)' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (cheapest)' },
]

function OpenAISection() {
  const [apiKey, setApiKey]         = useState('')
  const [model, setModel]           = useState('gpt-4o-mini')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [hasKey, setHasKey]         = useState(false)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    fetch('/api/integrations/openai').then(r => r.json()).then(d => {
      setModel(d.openai_model ?? 'gpt-4o-mini')
      setSystemPrompt(d.ai_system_prompt ?? '')
      setHasKey(d.has_api_key ?? false)
      setLoading(false)
    })
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const body: Record<string, string> = { openai_model: model, ai_system_prompt: systemPrompt }
    if (apiKey) body.openai_api_key = apiKey
    const res = await fetch('/api/integrations/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) { toast.success('OpenAI config saved'); setApiKey(''); setHasKey(true) }
    else { const d = await res.json(); toast.error(d.error) }
    setSaving(false)
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-white">OpenAI — AI Auto-reply</h3>
        {hasKey && <Badge className="text-xs bg-green-500/10 text-green-400 border-green-500/20">Connected</Badge>}
      </div>
      <p className="text-sm text-slate-400">
        Add an <strong className="text-slate-300">ai_reply</strong> step to any automation to generate context-aware
        WhatsApp replies using GPT. The AI reads the last 10 messages for context.
      </p>

      {loading ? (
        <div className="h-40 rounded-lg bg-slate-800/60 animate-pulse" />
      ) : (
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">
              OpenAI API Key {hasKey && <span className="text-green-400 text-xs">(already set — leave blank to keep)</span>}
            </Label>
            <Input value={apiKey} onChange={e => setApiKey(e.target.value)}
              type="password" placeholder={hasKey ? '••••••••••••••••' : 'sk-…'}
              className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">Model</Label>
            <Select value={model} onValueChange={v => v && setModel(v)}>
              <SelectTrigger className="border-slate-700 bg-slate-800 text-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 text-slate-200 border-slate-700">
                {OPENAI_MODELS.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">System prompt</Label>
            <Textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
              rows={4} placeholder="You are a helpful WhatsApp support agent…"
              className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 resize-none" />
          </div>
          <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {saving ? 'Saving…' : 'Save OpenAI config'}
          </Button>
        </form>
      )}
    </div>
  )
}

export function IntegrationsPanel() {
  return (
    <div className="space-y-6">
      <WebhooksSection />
      <OpenAISection />
    </div>
  )
}
