import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Auth pages — redirect to dashboard if already logged in
  if (user && (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password'
  )) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Protected pages — redirect to login if not authenticated
  const protectedPaths = ['/dashboard', '/inbox', '/contacts', '/pipelines', '/broadcasts', '/automations', '/settings', '/onboarding']
  if (!user && protectedPaths.some(path => pathname.startsWith(path))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Onboarding gate — new users who haven't completed setup go to /onboarding
  if (user && !pathname.startsWith('/onboarding') && !pathname.startsWith('/invite') && !pathname.startsWith('/api')) {
    const isDashboardPath = protectedPaths.some(p => pathname.startsWith(p))
    if (isDashboardPath) {
      // Resolve user's primary org
      const { data: member } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', user.id)
        .not('accepted_at', 'is', null)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (member?.org_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('onboarded_at')
          .eq('id', member.org_id)
          .maybeSingle()

        if (org && org.onboarded_at === null) {
          const url = request.nextUrl.clone()
          url.pathname = '/onboarding'
          return NextResponse.redirect(url)
        }
      }
    }
  }

  // API routes that need auth (not webhooks)
  if (!user && request.nextUrl.pathname.startsWith('/api/whatsapp/') &&
      !request.nextUrl.pathname.includes('/webhook')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
