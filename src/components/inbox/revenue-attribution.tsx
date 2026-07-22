'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { DollarSign, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog'

interface Props {
  conversationId: string
  conversionValue?: number | null
  convertedAt?: string | null
  conversionNote?: string | null
  onConverted: (value: number | null, note: string | null, convertedAt: string | null) => void
}

export function RevenueAttribution({
  conversationId,
  conversionValue,
  convertedAt,
  conversionNote,
  onConverted,
}: Props) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  const isConverted = !!convertedAt

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/conversations/${conversationId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: value !== '' ? Number(value) : null, note }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error ?? 'Failed'); return }
      toast.success('Marked as won!')
      onConverted(
        d.conversation.conversion_value,
        d.conversation.conversion_note,
        d.conversation.converted_at,
      )
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    try {
      const res = await fetch(`/api/conversations/${conversationId}/convert`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Failed to remove'); return }
      toast.success('Conversion removed')
      onConverted(null, null, null)
    } finally {
      setRemoving(false)
    }
  }

  if (isConverted) {
    return (
      <div className="flex items-center gap-1">
        <span
          className="inline-flex items-center gap-1 rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400"
          title={conversionNote ?? undefined}
        >
          <DollarSign className="size-2.5" />
          {conversionValue ? `Won $${Number(conversionValue).toLocaleString()}` : 'Won'}
        </span>
        <button
          onClick={handleRemove}
          disabled={removing}
          className="text-slate-500 hover:text-slate-300 transition-colors"
          title="Remove conversion"
        >
          {removing
            ? <Loader2 className="size-3 animate-spin" />
            : <X className="size-3" />}
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => { setValue(''); setNote(conversionNote ?? ''); setOpen(true) }}
        title="Mark as won"
        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-slate-400 hover:bg-slate-800 hover:text-green-400 transition-colors"
      >
        <DollarSign className="h-3.5 w-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Mark as Won</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-slate-300">
                Revenue value <span className="text-slate-500">(optional)</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <Input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0.00"
                  min={0}
                  step={0.01}
                  className="pl-7 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">
                Note <span className="text-slate-500">(optional)</span>
              </Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Closed deal, upsell, referral…"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 hover:bg-green-500 text-white"
            >
              {saving ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : 'Mark Won'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
