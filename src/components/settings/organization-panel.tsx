'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Copy, Trash2, UserPlus, Building2 } from 'lucide-react'
import { toast } from 'sonner'

interface Member {
  id: string
  email: string
  role: string
  accepted_at: string | null
  user_id: string | null
}

interface Org {
  id: string
  name: string
  slug: string
  plan: string
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-primary/10 text-primary border-primary/20',
  admin: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  member: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

export function OrganizationPanel() {
  const [org, setOrg] = useState<Org | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [myRole, setMyRole] = useState<string>('member')
  const [myId, setMyId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [inviting, setInviting] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    setMyId(user.id)

    // Use API route — fetches org + all members via admin client (bypasses RLS)
    const res = await fetch('/api/org/members')
    if (!res.ok) { setLoading(false); return }
    const { members: allMembers, org: orgData } = await res.json()

    setOrg(orgData)
    setOrgName(orgData.name)
    setMembers(allMembers ?? [])

    const me = (allMembers as Member[]).find(m => m.user_id === user.id)
    setMyRole(me?.role ?? 'member')

    setLoading(false)
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    try {
      const res = await fetch('/api/org/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }

      // Copy invite URL to clipboard
      await navigator.clipboard.writeText(data.invite_url)
      toast.success('Invite link copied to clipboard!')
      setInviteEmail('')
      load()
    } finally {
      setInviting(false)
    }
  }

  async function removeMember(memberId: string) {
    const res = await fetch(`/api/org/members/${memberId}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Member removed'); load() }
    else { const d = await res.json(); toast.error(d.error) }
  }

  async function changeRole(memberId: string, role: string) {
    const res = await fetch(`/api/org/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (res.ok) { toast.success('Role updated'); load() }
    else { const d = await res.json(); toast.error(d.error) }
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    if (!org) return
    setSavingName(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('organizations')
      .update({ name: orgName })
      .eq('id', org.id)
    if (error) toast.error(error.message)
    else { toast.success('Organization name updated'); setOrg({ ...org, name: orgName }) }
    setSavingName(false)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-slate-800/60 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!org) {
    return <p className="text-slate-400 text-sm">No organization found.</p>
  }

  const canManage = myRole === 'owner' || myRole === 'admin'

  return (
    <div className="space-y-8">
      {/* Org info */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{org.name}</p>
            <p className="text-xs text-slate-500">/{org.slug} · Plan: <span className="text-slate-300">{PLAN_LABELS[org.plan] ?? org.plan}</span></p>
          </div>
        </div>

        {myRole === 'owner' && (
          <form onSubmit={saveName} className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="orgName" className="text-slate-400 text-xs mb-1 block">Organization name</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="border-slate-700 bg-slate-800 text-white"
              />
            </div>
            <Button type="submit" disabled={savingName || orgName === org.name} className="self-end bg-primary text-primary-foreground hover:bg-primary/90">
              Save
            </Button>
          </form>
        )}
      </div>

      {/* Members list */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">Team members</h3>
        <div className="space-y-3">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3">
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
                  {m.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{m.email}</p>
                {!m.accepted_at && (
                  <p className="text-xs text-slate-500">Invite pending</p>
                )}
              </div>
              <Badge className={`text-xs border ${ROLE_COLORS[m.role] ?? ROLE_COLORS.member}`}>
                {m.role}
              </Badge>
              {canManage && m.role !== 'owner' && (m.user_id ?? '') !== myId && (
                <div className="flex items-center gap-1 shrink-0">
                  {myRole === 'owner' && (
                    <Select value={m.role} onValueChange={(r) => r && changeRole(m.id, r)}>
                      <SelectTrigger className="h-7 w-24 border-slate-700 bg-slate-800 text-xs text-slate-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 text-slate-200 border-slate-700">
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMember(m.id)}
                    className="h-7 w-7 text-slate-500 hover:text-red-400 hover:bg-red-500/10" aria-label="Remove member"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invite form */}
      {canManage && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-slate-400" /> Invite team member
          </h3>
          <form onSubmit={sendInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="inviteEmail" className="text-slate-400 text-xs mb-1 block">Email address</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                required
                className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="w-32">
              <Label className="text-slate-400 text-xs mb-1 block">Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'admin' | 'member')}>
                <SelectTrigger className="border-slate-700 bg-slate-800 text-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 text-slate-200 border-slate-700">
                  <SelectItem value="member">Member</SelectItem>
                  {myRole === 'owner' && <SelectItem value="admin">Admin</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={inviting} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              {inviting ? 'Generating…' : 'Copy invite link'}
            </Button>
          </form>
          <p className="text-xs text-slate-500">The invite link will be copied to your clipboard. Share it with your team member — it lets them join your workspace.</p>
        </div>
      )}
    </div>
  )
}
