'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, Calendar, Copy, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'

interface AppointmentType {
  id: string
  name: string
  description: string | null
  duration_min: number
  buffer_min: number
  color: string
  is_active: boolean
}

const emptyForm = { name: '', description: '', duration_min: 30, buffer_min: 5, color: '#6366f1' }

export function AppointmentsPanel() {
  const [types, setTypes] = useState<AppointmentType[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [orgSlug, setOrgSlug] = useState<string>('')
  const [upcoming, setUpcoming] = useState<unknown[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const [typesRes, apptRes] = await Promise.all([
      fetch('/api/appointment-types').then((r) => r.json()),
      fetch('/api/appointments').then((r) => r.json()),
    ])
    setTypes(typesRes.types ?? [])
    setUpcoming((apptRes.appointments ?? []).filter((a: { status: string }) => a.status !== 'cancelled'))

    // Get org slug
    const { data: { session } } = await createClient().auth.getSession()
    if (session?.user) {
      const { data: member } = await createClient()
        .from('org_members')
        .select('org:organizations(slug)')
        .eq('user_id', session.user.id)
        .not('accepted_at', 'is', null)
        .limit(1)
        .single()
      const slug = (member?.org as { slug?: string })?.slug ?? ''
      setOrgSlug(slug)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) { toast.error('Name required'); return }
    setSaving(true)
    const res = await fetch('/api/appointment-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    if (!res.ok) { toast.error(d.error ?? 'Failed'); setSaving(false); return }
    toast.success('Appointment type created')
    setDialogOpen(false)
    setForm(emptyForm)
    load()
    setSaving(false)
  }, [form, load])

  const bookingUrl = orgSlug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/book/${orgSlug}`
    : ''

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="size-5 animate-spin text-primary" />
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Booking link */}
      {bookingUrl && (
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-white">Your Booking Link</h3>
          <p className="text-xs text-slate-400">Share this link with customers so they can book appointments directly.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-xs text-primary font-mono truncate">
              {bookingUrl}
            </code>
            <Button variant="outline" size="icon"
              className="shrink-0 h-8 w-8 border-slate-700 text-slate-400 hover:text-white"
              onClick={() => { navigator.clipboard.writeText(bookingUrl); toast.success('Copied!') }}>
              <Copy className="size-3.5" />
            </Button>
            <Button variant="outline" size="icon"
              className="shrink-0 h-8 w-8 border-slate-700 text-slate-400 hover:text-white"
              onClick={() => window.open(bookingUrl, '_blank')}>
              <ExternalLink className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Appointment Types */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Appointment Types</h2>
            <p className="text-sm text-slate-400 mt-0.5">Define what customers can book.</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="size-4" /> Add Type
          </Button>
        </div>

        {types.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
            <Calendar className="size-8 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No appointment types yet</p>
            <p className="text-slate-500 text-xs mt-1">Add types like "Sales Call", "Support Session", etc.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {types.map((t) => (
              <div key={t.id}
                className="flex items-center gap-4 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
                <div className="h-10 w-10 shrink-0 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: t.color + '20' }}>
                  <Calendar className="size-5" style={{ color: t.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.duration_min} min · {t.buffer_min} min buffer</p>
                  {t.description && <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>}
                </div>
                <Button variant="ghost" size="icon"
                  className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                  onClick={async () => {
                    if (!confirm('Delete this appointment type?')) return
                    setDeletingId(t.id)
                    try {
                      await createClient().from('appointment_types').delete().eq('id', t.id)
                      toast.success('Deleted')
                      load()
                    } catch {
                      toast.error('Failed')
                    } finally {
                      setDeletingId(null)
                    }
                  }}
                  disabled={deletingId === t.id}>
                  {deletingId === t.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Appointments */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Upcoming Appointments</h2>
          <div className="space-y-2">
            {(upcoming as Array<{
              id: string
              title: string
              starts_at: string
              ends_at: string
              status: string
              booker_name: string
              booker_phone: string
              appointment_type?: { color?: string }
            }>).slice(0, 10).map((a) => (
              <div key={a.id}
                className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
                <div className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: (a.appointment_type?.color ?? '#6366f1') + '20' }}>
                  <Calendar className="size-4" style={{ color: a.appointment_type?.color ?? '#6366f1' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{a.title}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(a.starts_at).toLocaleString()} · {a.booker_phone}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                  a.status === 'confirmed' ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : a.status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : 'bg-slate-700 border-slate-600 text-slate-400'
                }`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">New Appointment Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-slate-300">Name <span className="text-red-400">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Sales Call, Support Session"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What happens in this appointment?"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-slate-300">Duration (min)</Label>
                <Input type="number" value={form.duration_min}
                  onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })}
                  min={15} max={480} step={15}
                  className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Buffer (min)</Label>
                <Input type="number" value={form.buffer_min}
                  onChange={(e) => setForm({ ...form, buffer_min: Number(e.target.value) })}
                  min={0} max={60} step={5}
                  className="bg-slate-800 border-slate-700 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="h-9 w-16 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer" />
                <span className="text-sm text-slate-400 font-mono">{form.color}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</Button>
            <Button onClick={handleSave} disabled={saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {saving ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
