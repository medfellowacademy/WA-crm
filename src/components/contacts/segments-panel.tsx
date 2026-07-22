'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, Users, Tag, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import type { Tag as TagType } from '@/types'

interface Segment {
  id: string
  name: string
  description: string | null
  filters: Record<string, unknown>
  contact_count: number
  created_at: string
}

interface SegmentsPanelProps {
  onSelectSegment?: (segment: Segment) => void
  selectedSegmentId?: string | null
}

export function SegmentsPanel({ onSelectSegment, selectedSegmentId }: SegmentsPanelProps) {
  const [segments, setSegments] = useState<Segment[]>([])
  const [tags, setTags] = useState<TagType[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    tag_ids: [] as string[],
    has_conversation: false,
    sentiment: '' as '' | 'positive' | 'neutral' | 'negative',
    inactive_days: '' as string,
    is_converted: false,
  })

  const load = useCallback(async () => {
    setLoading(true)
    const [segRes, tagsData] = await Promise.all([
      fetch('/api/segments').then((r) => r.json()),
      createClient().from('tags').select('*').order('name'),
    ])
    setSegments(segRes.segments ?? [])
    setTags(tagsData.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    const filters: Record<string, unknown> = {}
    if (form.tag_ids.length) filters.tag_ids = form.tag_ids
    if (form.has_conversation) filters.has_conversation = true
    if (form.sentiment) filters.sentiment = form.sentiment
    if (form.inactive_days && Number(form.inactive_days) > 0) filters.inactive_days = Number(form.inactive_days)
    if (form.is_converted) filters.is_converted = true

    const res = await fetch('/api/segments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, description: form.description, filters }),
    })
    const d = await res.json()
    if (!res.ok) { toast.error(d.error ?? 'Failed to create'); setSaving(false); return }
    toast.success(`Segment created — ${d.segment.contact_count} contacts`)
    setDialogOpen(false)
    setForm({ name: '', description: '', tag_ids: [], has_conversation: false, sentiment: '', inactive_days: '', is_converted: false })
    load()
    setSaving(false)
  }, [form, load])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this segment?')) return
    setDeletingId(id)
    const res = await fetch(`/api/segments/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Deleted'); load() }
    else toast.error('Failed to delete')
    setDeletingId(null)
  }, [load])

  const toggleTag = (tagId: string) => {
    setForm((f) => ({
      ...f,
      tag_ids: f.tag_ids.includes(tagId)
        ? f.tag_ids.filter((id) => id !== tagId)
        : [...f.tag_ids, tagId],
    }))
  }

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="size-5 animate-spin text-primary" />
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Segments</h3>
        <Button size="sm" variant="ghost"
          className="h-7 gap-1 text-xs text-slate-400 hover:text-white"
          onClick={() => setDialogOpen(true)}>
          <Plus className="size-3.5" /> New
        </Button>
      </div>

      {segments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 p-4 text-center">
          <p className="text-xs text-slate-500">No segments yet</p>
          <button onClick={() => setDialogOpen(true)}
            className="mt-1 text-xs text-primary hover:underline">
            Create one
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {segments.map((seg) => (
            <div key={seg.id}
              className={`group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors cursor-pointer
                ${selectedSegmentId === seg.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-300 hover:bg-slate-800'}`}
              onClick={() => onSelectSegment?.(seg)}>
              <Users className="size-3.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{seg.name}</p>
                <p className="text-[10px] text-slate-500">{seg.contact_count} contacts</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(seg.id) }}
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                disabled={deletingId === seg.id}>
                {deletingId === seg.id
                  ? <Loader2 className="size-3 animate-spin" />
                  : <Trash2 className="size-3" />}
              </button>
              {onSelectSegment && (
                <ChevronRight className="size-3 shrink-0 text-slate-500" />
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">New Segment</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a saved audience filter for targeting broadcasts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-slate-300">Segment Name <span className="text-red-400">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. VIP Customers, Inactive Users"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Description <span className="text-slate-500">(optional)</span></Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Who belongs in this segment?"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            {/* Filter: Tags */}
            <div className="space-y-2">
              <Label className="text-slate-300">Filter by Tags</Label>
              {tags.length === 0 ? (
                <p className="text-xs text-slate-500">No tags created yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      style={{ backgroundColor: form.tag_ids.includes(tag.id) ? tag.color : undefined }}
                      className={`cursor-pointer text-xs transition-all ${
                        form.tag_ids.includes(tag.id)
                          ? 'text-white opacity-100'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <Tag className="size-2.5 mr-1" />
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
              {form.tag_ids.length > 0 && (
                <p className="text-xs text-slate-500">Contacts with ANY of these tags</p>
              )}
            </div>

            {/* Filter: Has conversation */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="has-conv"
                checked={form.has_conversation}
                onChange={(e) => setForm({ ...form, has_conversation: e.target.checked })}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-primary"
              />
              <Label htmlFor="has-conv" className="text-slate-300 cursor-pointer">
                Only contacts with a conversation
              </Label>
            </div>

            {/* Filter: Sentiment */}
            <div className="space-y-2">
              <Label className="text-slate-300">Sentiment filter</Label>
              <div className="flex gap-2">
                {(['', 'positive', 'neutral', 'negative'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, sentiment: s })}
                    className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                      form.sentiment === s
                        ? s === 'positive' ? 'border-green-500/50 bg-green-500/10 text-green-400'
                          : s === 'negative' ? 'border-red-500/50 bg-red-500/10 text-red-400'
                          : s === 'neutral' ? 'border-slate-500/50 bg-slate-500/10 text-slate-300'
                          : 'border-primary/50 bg-primary/10 text-primary'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {s === '' ? 'Any' : s === 'positive' ? '😊 Positive' : s === 'neutral' ? '😐 Neutral' : '😤 Negative'}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter: Inactive days */}
            <div className="space-y-2">
              <Label className="text-slate-300">
                Inactive for <span className="text-slate-500">(no message in last N days)</span>
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={form.inactive_days}
                  onChange={(e) => setForm({ ...form, inactive_days: e.target.value })}
                  placeholder="e.g. 30"
                  min={1}
                  className="w-24 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                />
                <span className="text-sm text-slate-400">days</span>
              </div>
            </div>

            {/* Filter: Converted (revenue attributed) */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is-converted"
                checked={form.is_converted}
                onChange={(e) => setForm({ ...form, is_converted: e.target.checked })}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-primary"
              />
              <Label htmlFor="is-converted" className="text-slate-300 cursor-pointer">
                Only contacts marked as won (revenue attributed)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {saving ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : 'Create Segment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
