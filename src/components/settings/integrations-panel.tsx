'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Plus, Zap, Bot, ExternalLink, CheckCircle2, XCircle, Key, Copy, Sheet, ShoppingBag, Loader2, RefreshCw } from 'lucide-react'
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

// ── API Keys section ─────────────────────────────────────────
interface ApiKey {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  last_used_at: string | null
  created_at: string
}

function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<string[]>(['read', 'write'])
  const [saving, setSaving] = useState(false)
  // The plaintext key is returned exactly once — held here until dismissed.
  const [newKey, setNewKey] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/integrations/api-keys')
    const d = await res.json()
    setKeys(d.keys ?? [])
    setLoading(false)
  }

  function toggleScope(s: string) {
    setScopes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/integrations/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, scopes }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error ?? 'Failed to create key'); return }
      setNewKey(d.plaintext)
      setName('')
      setScopes(['read', 'write'])
      setAdding(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function revoke(id: string) {
    if (!confirm('Revoke this key? Any integration using it will stop working immediately.')) return
    const res = await fetch(`/api/integrations/api-keys/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Key revoked'); load() }
    else toast.error('Failed to revoke')
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-white">API Keys</h3>
        </div>
        <Button size="sm" onClick={() => setAdding(v => !v)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-8">
          <Plus className="h-3.5 w-3.5 mr-1" /> New key
        </Button>
      </div>
      <p className="text-sm text-slate-400">
        Authenticate the REST API at <code className="text-slate-300">/api/v1</code> to push contacts,
        add tags, and sync data from Zapier, Make, n8n, Google Sheets, or your own backend.
      </p>

      {/* One-time plaintext reveal */}
      {newKey && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 space-y-2">
          <p className="text-xs font-medium text-green-400">
            Copy your key now — you won&apos;t be able to see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-slate-200 break-all font-mono">{newKey}</code>
            <Button size="icon" variant="outline"
              className="h-8 w-8 shrink-0 border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => { navigator.clipboard.writeText(newKey); toast.success('Copied!') }}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <button onClick={() => setNewKey(null)}
            className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2">
            I&apos;ve saved it — dismiss
          </button>
        </div>
      )}

      {/* Add form */}
      {adding && (
        <form onSubmit={create} className="rounded-lg border border-slate-700 bg-slate-800/60 p-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Zapier production"
              required className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 h-8 text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300 text-xs">Permissions</Label>
            <div className="flex gap-2">
              {[{ id: 'read', label: 'Read' }, { id: 'write', label: 'Write' }].map(s => (
                <button key={s.id} type="button" onClick={() => toggleScope(s.id)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    scopes.includes(s.id)
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setAdding(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 h-8">Cancel</Button>
            <Button type="submit" size="sm" disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-8">
              {saving ? 'Creating…' : 'Create key'}
            </Button>
          </div>
        </form>
      )}

      {/* Key list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-12 rounded-lg bg-slate-800/60 animate-pulse" />)}
        </div>
      ) : keys.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">No API keys yet.</p>
      ) : (
        <div className="space-y-2">
          {keys.map(k => (
            <div key={k.id} className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/40 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{k.name}</p>
                <p className="text-xs text-slate-500 font-mono truncate">{k.key_prefix}…</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:flex flex-wrap gap-1">
                  {k.scopes.map(s => (
                    <Badge key={s} className="text-xs bg-slate-700/60 text-slate-300 border-slate-600 px-1.5 py-0">
                      {s}
                    </Badge>
                  ))}
                </div>
                <span className="text-xs text-slate-500 hidden sm:inline">
                  {k.last_used_at ? `used ${new Date(k.last_used_at).toLocaleDateString()}` : 'never used'}
                </span>
                <Button variant="ghost" size="icon" onClick={() => revoke(k.id)}
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

// ── Native integrations (Google Sheets, Shopify) ─────────────
interface ProviderState {
  available: boolean
  connected: boolean
  meta: { external_id?: string | null } | null
}
interface ConnectionsState {
  google_sheets: ProviderState
  shopify: ProviderState
}

function NativeIntegrationsSection() {
  const [state, setState] = useState<ConnectionsState | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [shopDomain, setShopDomain] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/integrations/connections')
    if (res.ok) setState(await res.json())
    setLoading(false)
  }

  async function disconnect(provider: string) {
    if (!confirm('Disconnect this integration?')) return
    setBusy(provider)
    await fetch(`/api/integrations/connections?provider=${provider}`, { method: 'DELETE' })
    await load()
    setBusy(null)
  }

  async function syncSheets() {
    setBusy('google_sheets_sync')
    try {
      const res = await fetch('/api/integrations/google/sync', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error ?? 'Sync failed'); return }
      toast.success(`Exported ${d.exported} contacts`)
      if (d.spreadsheet_url) window.open(d.spreadsheet_url, '_blank')
    } finally { setBusy(null) }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-white">Native Integrations</h3>
      </div>
      <p className="text-sm text-slate-400">
        Connect directly — no Zapier required. New customers and orders flow straight into your CRM.
      </p>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-16 rounded-lg bg-slate-800/60 animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Google Sheets */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4">
            <div className="flex items-center gap-3">
              <Sheet className="h-5 w-5 text-green-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">Google Sheets</p>
                <p className="text-xs text-slate-500">Export contacts to a live spreadsheet.</p>
              </div>
              {!state?.google_sheets.available ? (
                <span className="text-xs text-slate-500">Not configured</span>
              ) : state.google_sheets.connected ? (
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={syncSheets} disabled={busy === 'google_sheets_sync'}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 h-8">
                    {busy === 'google_sheets_sync'
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <><RefreshCw className="h-3.5 w-3.5 mr-1" /> Sync</>}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => disconnect('google_sheets')}
                    className="h-8 text-slate-400 hover:text-red-400">Disconnect</Button>
                </div>
              ) : (
                <Button size="sm" render={<a href="/api/integrations/google/connect" />}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-8">Connect</Button>
              )}
            </div>
          </div>

          {/* Shopify */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-5 w-5 text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">Shopify</p>
                <p className="text-xs text-slate-500">
                  {state?.shopify.connected
                    ? `Connected: ${state.shopify.meta?.external_id ?? 'store'}`
                    : 'New orders & customers create contacts automatically.'}
                </p>
              </div>
              {!state?.shopify.available ? (
                <span className="text-xs text-slate-500">Not configured</span>
              ) : state.shopify.connected ? (
                <Button size="sm" variant="ghost" onClick={() => disconnect('shopify')}
                  className="h-8 text-slate-400 hover:text-red-400">Disconnect</Button>
              ) : null}
            </div>
            {state?.shopify.available && !state.shopify.connected && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (shopDomain.trim()) window.location.href = `/api/integrations/shopify/connect?shop=${encodeURIComponent(shopDomain.trim())}`
                }}
                className="mt-3 flex gap-2">
                <Input value={shopDomain} onChange={e => setShopDomain(e.target.value)}
                  placeholder="your-store.myshopify.com"
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 h-8 text-sm" />
                <Button type="submit" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 shrink-0">
                  Connect
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function IntegrationsPanel() {
  return (
    <div className="space-y-6">
      <NativeIntegrationsSection />
      <ApiKeysSection />
      <WebhooksSection />
      <OpenAISection />
    </div>
  )
}
