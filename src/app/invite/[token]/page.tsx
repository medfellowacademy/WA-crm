'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type State = 'loading' | 'ready' | 'accepted' | 'error'

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [state, setState] = useState<State>('loading')
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Fetch invite info via public RPC — no auth needed to preview
      const { data, error } = await supabase
        .from('org_members')
        .select('id, email, role, accepted_at, org:organizations(name)')
        .eq('invite_token', token)
        .maybeSingle()

      if (error || !data) {
        setError('This invite link is invalid or has expired.')
        setState('error')
        return
      }

      if (data.accepted_at) {
        setError('This invite has already been accepted.')
        setState('error')
        return
      }

      setOrgName((data.org as unknown as { name: string })?.name ?? 'the organization')

      if (!user) {
        // Redirect to signup with the token stored in the URL
        router.push(`/signup?invite=${token}`)
        return
      }

      setState('ready')
    }
    load()
  }, [token, router])

  async function accept() {
    setState('loading')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push(`/login?invite=${token}`); return }

    const res = await fetch(`/api/org/invite/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })

    if (res.ok) {
      setState('accepted')
      setTimeout(() => router.push('/dashboard'), 1500)
    } else {
      const d = await res.json()
      setError(d.error ?? 'Failed to accept invite')
      setState('error')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            {state === 'accepted' ? (
              <CheckCircle className="h-6 w-6 text-primary" />
            ) : state === 'error' ? (
              <XCircle className="h-6 w-6 text-red-400" />
            ) : (
              <MessageSquare className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle className="text-xl text-white">
            {state === 'accepted' ? 'Welcome aboard!' :
             state === 'error' ? 'Invalid invite' :
             state === 'loading' ? 'Loading…' :
             `Join ${orgName}`}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {state === 'accepted' ? 'Redirecting to your dashboard…' :
             state === 'error' ? error :
             state === 'loading' ? 'Please wait…' :
             `You've been invited to join ${orgName} on WaCRM.`}
          </CardDescription>
        </CardHeader>

        {state === 'ready' && (
          <CardContent>
            <Button onClick={accept} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Accept invitation
            </Button>
          </CardContent>
        )}

        {state === 'loading' && (
          <CardContent className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </CardContent>
        )}
      </Card>
    </div>
  )
}
