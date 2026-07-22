'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, ShoppingBag, Link2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  currency: string
  image_url: string | null
  sku: string | null
  is_active: boolean
}

function money(v: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(v)
}

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', price: '', currency: 'USD', image_url: '', sku: '' })

  // Payment link dialog
  const [linkProduct, setLinkProduct] = useState<Product | null>(null)
  const [linkPhone, setLinkPhone] = useState('')
  const [linkBusy, setLinkBusy] = useState(false)
  const [linkResult, setLinkResult] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/products')
    const d = await res.json()
    setProducts(d.products ?? [])
    setLoading(false)
  }

  async function save() {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/products', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error ?? 'Failed'); return }
      toast.success('Product added')
      setDialogOpen(false)
      setForm({ name: '', description: '', price: '', currency: 'USD', image_url: '', sku: '' })
      load()
    } finally { setSaving(false) }
  }

  async function remove(id: string) {
    if (!confirm('Delete this product?')) return
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Deleted'); load() } else toast.error('Failed')
  }

  async function createLink(send: boolean) {
    if (!linkProduct) return
    setLinkBusy(true)
    setLinkResult(null)
    try {
      const res = await fetch('/api/commerce/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: linkProduct.id, phone: send ? linkPhone : undefined, send }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error ?? 'Failed to create link'); return }
      setLinkResult(d.url)
      if (d.sent) toast.success('Payment link sent on WhatsApp')
      else { await navigator.clipboard.writeText(d.url); toast.success('Payment link copied') }
    } finally { setLinkBusy(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Catalog</h1>
          <p className="mt-1 text-sm text-slate-400">Products you sell over WhatsApp, with one-tap payment links.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add product
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-xl bg-slate-800/60 animate-pulse" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-12 text-center">
          <ShoppingBag className="mx-auto h-8 w-8 text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-400">No products yet</p>
          <p className="mt-1 text-xs text-slate-500">Add your first product to start sending payment links.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden flex flex-col">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt={p.name} className="h-32 w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              ) : (
                <div className="h-32 w-full bg-slate-800 flex items-center justify-center">
                  <ShoppingBag className="h-7 w-7 text-slate-600" />
                </div>
              )}
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{p.name}</p>
                    {p.sku && <p className="text-xs text-slate-500">SKU {p.sku}</p>}
                  </div>
                  <span className="text-sm font-semibold text-green-400 shrink-0">{money(p.price, p.currency)}</span>
                </div>
                {p.description && <p className="mt-1 text-xs text-slate-400 line-clamp-2">{p.description}</p>}
                <div className="mt-3 flex items-center gap-2 pt-2">
                  <Button size="sm" variant="outline"
                    className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 h-8"
                    onClick={() => { setLinkProduct(p); setLinkPhone(''); setLinkResult(null) }}>
                    <Link2 className="h-3.5 w-3.5" /> Payment link
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(p.id)}
                    className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add product dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Add product</DialogTitle>
            <DialogDescription className="text-slate-400">Add an item to your WhatsApp catalog.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Premium Plan" className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Price</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="49.00" className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Currency</Label>
                <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  placeholder="USD" className="bg-slate-800 border-slate-700 text-white" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What is it?" className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Image URL</Label>
                <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://…" className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">SKU</Label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="optional" className="bg-slate-800 border-slate-700 text-white" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Add product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment link dialog */}
      <Dialog open={!!linkProduct} onOpenChange={(o) => { if (!o) setLinkProduct(null) }}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Payment link</DialogTitle>
            <DialogDescription className="text-slate-400">
              {linkProduct ? `${linkProduct.name} — ${money(linkProduct.price, linkProduct.currency)}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {linkResult && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                <p className="text-xs text-green-400 break-all font-mono">{linkResult}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Send to phone (optional)</Label>
              <Input value={linkPhone} onChange={(e) => setLinkPhone(e.target.value)}
                placeholder="15551234567" className="bg-slate-800 border-slate-700 text-white" />
              <p className="text-xs text-slate-500">Leave blank to just copy the link.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={linkBusy} onClick={() => createLink(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800">
              {linkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Create & copy
            </Button>
            <Button disabled={linkBusy || !linkPhone.trim()} onClick={() => createLink(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90">
              {linkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send on WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
