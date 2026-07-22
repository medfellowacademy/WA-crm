'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Calendar, Clock, CheckCircle, Loader2, Phone, User, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { adminClient } from '@/lib/org'
import { cn } from '@/lib/utils'
import { format, addDays, isSameDay, startOfDay } from 'date-fns'

interface AppointmentType {
  id: string
  name: string
  description: string | null
  duration_min: number
  color: string
}

interface OrgInfo {
  id: string
  name: string
}

// Generate available time slots for a day (9am-5pm, every 30min)
function generateSlots(date: Date, durationMin: number): Date[] {
  const slots: Date[] = []
  const start = new Date(date)
  start.setHours(9, 0, 0, 0)
  const end = new Date(date)
  end.setHours(17, 0, 0, 0)
  let current = start
  while (current < end) {
    slots.push(new Date(current))
    current = new Date(current.getTime() + durationMin * 60000)
  }
  return slots
}

export default function BookingPage() {
  const params = useParams()
  const slug = params.slug as string

  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [types, setTypes] = useState<AppointmentType[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [selectedType, setSelectedType] = useState<AppointmentType | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null)
  const [step, setStep] = useState<'type' | 'datetime' | 'details' | 'done'>('type')

  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        // Fetch org + appointment types via public API
        const res = await fetch(`/api/book/${slug}`)
        if (!res.ok) { setNotFound(true); setLoading(false); return }
        const d = await res.json()
        setOrg(d.org)
        setTypes(d.types ?? [])
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  async function handleSubmit() {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Name and phone are required')
      return
    }
    if (!selectedSlot || !selectedType) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_slug: slug,
          appointment_type_id: selectedType.id,
          starts_at: selectedSlot.toISOString(),
          booker_name: form.name.trim(),
          booker_phone: form.phone.trim(),
          booker_email: form.email.trim() || null,
          notes: form.notes.trim() || null,
        }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error ?? 'Failed to book'); return }
      setStep('done')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  )

  if (notFound || !org) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-2">
      <p className="text-white font-semibold">Booking page not found</p>
      <p className="text-slate-400 text-sm">This link may be invalid or expired.</p>
    </div>
  )

  const calendarDays = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1))
  const slots = selectedDate && selectedType
    ? generateSlots(selectedDate, selectedType.duration_min)
    : []

  return (
    <div className="min-h-screen bg-slate-950 py-10 px-4">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">{org.name}</h1>
          <p className="mt-1 text-slate-400 text-sm">Book an appointment</p>
        </div>

        {step === 'done' ? (
          <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-8 text-center">
            <CheckCircle className="size-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Booking Confirmed!</h2>
            <p className="text-slate-400 text-sm">
              Your {selectedType?.name} is booked for{' '}
              {selectedSlot && format(selectedSlot, 'EEEE, MMMM d')} at{' '}
              {selectedSlot && format(selectedSlot, 'h:mm a')}.
            </p>
            <p className="text-slate-500 text-xs mt-3">
              We'll reach out via WhatsApp to confirm.
            </p>
          </div>
        ) : (
          <>
            {/* Step 1: Choose appointment type */}
            {step === 'type' && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                  Select appointment type
                </h2>
                {types.length === 0 ? (
                  <div className="rounded-xl border border-slate-700 p-8 text-center">
                    <p className="text-slate-400 text-sm">No appointment types available</p>
                  </div>
                ) : (
                  types.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setSelectedType(t); setStep('datetime') }}
                      className="w-full text-left rounded-xl border border-slate-700 bg-slate-900 p-4 hover:border-primary/50 hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: t.color + '20' }}>
                          <Calendar className="size-5" style={{ color: t.color }} />
                        </div>
                        <div>
                          <p className="font-medium text-white">{t.name}</p>
                          <p className="text-sm text-slate-400">{t.duration_min} minutes</p>
                          {t.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Step 2: Pick date + time */}
            {step === 'datetime' && selectedType && (
              <div className="space-y-4">
                <button onClick={() => setStep('type')} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                  ← Back
                </button>
                <div>
                  <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
                    Pick a date
                  </h2>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {calendarDays.map((day) => (
                      <button
                        key={day.toISOString()}
                        onClick={() => { setSelectedDate(day); setSelectedSlot(null) }}
                        className={cn(
                          'shrink-0 flex flex-col items-center rounded-xl border px-3 py-2 transition-colors min-w-[60px]',
                          selectedDate && isSameDay(day, selectedDate)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
                        )}
                      >
                        <span className="text-[10px] font-medium uppercase">{format(day, 'EEE')}</span>
                        <span className="text-lg font-bold">{format(day, 'd')}</span>
                        <span className="text-[10px] text-slate-500">{format(day, 'MMM')}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedDate && (
                  <div>
                    <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
                      Pick a time
                    </h2>
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map((slot) => (
                        <button
                          key={slot.toISOString()}
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            'rounded-lg border px-3 py-2 text-sm transition-colors',
                            selectedSlot && slot.getTime() === selectedSlot.getTime()
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
                          )}
                        >
                          {format(slot, 'h:mm a')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSlot && (
                  <Button
                    onClick={() => setStep('details')}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Continue
                  </Button>
                )}
              </div>
            )}

            {/* Step 3: Contact details */}
            {step === 'details' && selectedType && selectedSlot && (
              <div className="space-y-4">
                <button onClick={() => setStep('datetime')} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                  ← Back
                </button>

                {/* Booking summary */}
                <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Calendar className="size-4 text-primary" />
                    <span>{format(selectedSlot, 'EEEE, MMMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Clock className="size-4 text-primary" />
                    <span>{format(selectedSlot, 'h:mm a')} ({selectedType.duration_min} min)</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300"><User className="inline size-3 mr-1" />Your Name <span className="text-red-400">*</span></Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Full name"
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300"><Phone className="inline size-3 mr-1" />WhatsApp Number <span className="text-red-400">*</span></Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+1234567890"
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300"><Mail className="inline size-3 mr-1" />Email <span className="text-slate-500">(optional)</span></Label>
                    <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                      type="email" placeholder="you@example.com"
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Notes <span className="text-slate-500">(optional)</span></Label>
                    <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      rows={2} placeholder="Anything you'd like us to know?"
                      className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-primary/50" />
                  </div>
                </div>

                <Button onClick={handleSubmit} disabled={submitting}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  {submitting ? <><Loader2 className="size-4 animate-spin" /> Booking…</> : 'Confirm Booking'}
                </Button>
                <p className="text-center text-xs text-slate-500">
                  We'll confirm via WhatsApp at the number you provide.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
