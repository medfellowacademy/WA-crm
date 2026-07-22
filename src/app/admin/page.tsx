'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, MessageSquare, TrendingUp, Building2,
  Search, ChevronLeft, ChevronRight, Shield,
  CheckCircle2, XCircle, Clock, AlertTriangle,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface Stats { total_orgs: number; paid_orgs: number; messages_month: number; new_today: number }
interface Org {
  id: string; name: string; slug: string; plan: string; subscription_status: string
  created_at: string; onboarded_at: string | null; member_count: number; contact_count: number
  messages_30d: number; broadcast_count: number; last_activity: string | null
  stripe_customer_id: string | null
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  active:   <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />,
  free:     <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />,
  past_due: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />,
  canceled: <XCircle className="h-3.5 w-3.5 text-red-400" />,
  trialing: <Clock className="h-3.5 w-3.5 text-blue-400" />,
}

const PLAN_COLORS: Record<string, string> = {
  free:     'bg-slate-700/50 text-slate-300 border-slate-600',
  starter:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  pro:      'bg-violet-500/10 text-violet-400 border-violet-500/20',
  business: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center gap-2 text-slate-400 text-xs mb-3">
        <Icon className="h-4 w-4" />{label}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [stats,   setStats]   = useState<Stats | null>(null)
  const [orgs,    setOrgs]    = useState<Org[]>([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [search,  setSearch]  = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => {
      if (r.status === 403) { setForbidden(true); return null }
      if (r.status === 401) { router.push('/login'); return null }
      return r.json()
    }).then(d => d && setStats(d))
  }, [router])

  const loadOrgs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), q: search })
    if (planFilter !== 'all') params.set('plan', planFilter)
    const res = await fetch(`/api/admin/orgs?${params}`)
    if (res.status === 403) { setForbidden(true); setLoading(false); return }
    const d = await res.json()
    setOrgs(d.orgs ?? [])
    setTotal(d.total ?? 0)
    setLoading(false)
  }, [page, search, planFilter])

  useEffect(() => { loadOrgs() }, [loadOrgs])

  async function changePlan(orgId: string, plan: string) {
    await fetch(`/api/admin/orgs/${orgId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    toast.success('Plan updated')
    loadOrgs()
  }

  if (forbidden) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="text-center">
        <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-slate-400 text-sm">You are not a super admin.</p>
      </div>
    </div>
  )

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-bold text-white">WA CRM — Admin</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}
          className="border-slate-700 text-slate-300 hover:bg-slate-800 h-8 text-xs">
          ← Back to app
        </Button>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Building2}    label="Total orgs"      value={stats?.total_orgs    ?? '—'} />
          <StatCard icon={TrendingUp}   label="Paid orgs"       value={stats?.paid_orgs     ?? '—'} sub="active subscriptions" />
          <StatCard icon={MessageSquare} label="Messages (MTD)" value={stats?.messages_month?.toLocaleString() ?? '—'} />
          <StatCard icon={Users}        label="New signups today" value={stats?.new_today    ?? '—'} />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search organizations…"
              className="pl-9 border-slate-700 bg-slate-900 text-white placeholder:text-slate-500" />
          </div>
          <Select value={planFilter} onValueChange={v => { setPlanFilter(v ?? 'all'); setPage(1) }}>
            <SelectTrigger className="w-40 border-slate-700 bg-slate-900 text-slate-300">
              <SelectValue placeholder="All plans" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 text-slate-200 border-slate-700">
              <SelectItem value="all">All plans</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 border-b border-slate-800">
                <tr>
                  {['Organization','Plan','Status','Members','Contacts','Msgs 30d','Signed up','Last active',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-slate-400 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  Array.from({length:5}).map((_,i) => (
                    <tr key={i}><td colSpan={9} className="px-4 py-4"><div className="h-4 bg-slate-800 rounded animate-pulse" /></td></tr>
                  ))
                ) : orgs.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">No organizations found</td></tr>
                ) : orgs.map(org => (
                  <tr key={org.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{org.name}</p>
                      <p className="text-xs text-slate-500">{org.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs border ${PLAN_COLORS[org.plan] ?? PLAN_COLORS.free}`}>
                        {org.plan}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {STATUS_ICONS[org.subscription_status] ?? STATUS_ICONS.free}
                        <span className="text-xs text-slate-400 capitalize">{org.subscription_status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{org.member_count}</td>
                    <td className="px-4 py-3 text-slate-300">{org.contact_count?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-300">{org.messages_30d?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(org.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {org.last_activity ? new Date(org.last_activity).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Select onValueChange={v => v && changePlan(org.id, v)} defaultValue={org.plan}>
                        <SelectTrigger className="h-7 w-28 border-slate-700 bg-slate-800 text-slate-300 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 text-slate-200 border-slate-700">
                          {['free','starter','pro','business'].map(p => (
                            <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-900/60">
              <p className="text-xs text-slate-400">
                Showing {((page-1)*20)+1}–{Math.min(page*20, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                  className="h-7 w-7 p-0 border-slate-700 text-slate-400 hover:bg-slate-800">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-slate-400">{page} / {totalPages}</span>
                <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                  className="h-7 w-7 p-0 border-slate-700 text-slate-400 hover:bg-slate-800">
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
