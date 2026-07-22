'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog'

interface QuickReply {
  id: string
  shortcut: string
  message: string
  created_at: string
}

const emptyForm = { shortcut: '', message: '' }

export function QuickRepliesPanel() {
  const [replies, setReplies] = useState<QuickReply[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/quick-replies')
    if (res.ok) {
      const d = await res.json()
      setReplies(d.replies ?? [])
    }
    setLoading(false)
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(qr: QuickReply) {
    setEditingId(qr.id)
    setForm({ shortcut: qr.shortcut, message: qr.message })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.shortcut.trim()) { toast.error('Shortcut is required'); return }
    if (!form.message.trim()) { toast.error('Message is required'); return }
    setSaving(true)
    try {
      const url = editingId ? `/api/quick-replies/${editingId}` : '/api/quick-replies'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortcut: form.shortcut.trim(), message: form.message.trim() }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error ?? 'Failed to save'); return }
      toast.success(editingId ? 'Updated' : 'Created')
      setDialogOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this quick reply?')) return
    setDeletingId(id)
    const res = await fetch(`/api/quick-replies/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Deleted'); load() }
    else toast.error('Failed to delete')
    setDeletingId(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="size-5 animate-spin text-primary" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Quick Replies</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Type <kbd className="rounded bg-slate-700 px-1 py-0.5 text-xs font-mono text-primary">/</kbd> in the inbox to insert a saved response instantly.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0">
          <Plus className="size-4" /> Add Reply
        </Button>
      </div>

      {replies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
          <p className="text-slate-400 text-sm">No quick replies yet</p>
          <p className="text-slate-500 text-xs mt-1">Add saved responses to speed up conversations</p>
        </div>
      ) : (
        <div className="space-y-2">
          {replies.map((qr) => (
            <div key={qr.id} className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-semibold text-primary">/{qr.shortcut}</span>
                </div>
                <p className="text-sm text-slate-300 line-clamp-2">{qr.message}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon"
                  className="h-8 w-8 text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                  onClick={() => openEdit(qr)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon"
                  className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                  disabled={deletingId === qr.id}
                  onClick={() => handleDelete(qr.id)}>
                  {deletingId === qr.id
                    ? <Loader2 className="size-3.5 animate-spin" />
                    : <Trash2 className="size-3.5" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingId ? 'Edit Quick Reply' : 'New Quick Reply'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-slate-300">
                Shortcut <span className="text-red-400">*</span>
              </Label>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-mono">/</span>
                <Input
                  placeholder="e.g. greet, pricing, thanks"
                  value={form.shortcut}
                  onChange={(e) => setForm({ ...form, shortcut: e.target.value.replace(/\s/g, '') })}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
              <p className="text-xs text-slate-500">No spaces — agents type /shortcut to trigger</p>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">
                Message <span className="text-red-400">*</span>
              </Label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={4}
                placeholder="The full message that will be inserted..."
                className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-primary/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {saving
                ? <><Loader2 className="size-4 animate-spin" /> Saving…</>
                : editingId ? <><Check className="size-4" /> Save</> : <><Plus className="size-4" /> Create</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
