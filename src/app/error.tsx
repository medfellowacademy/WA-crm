'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[App Error]', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mb-6">
        <AlertTriangle className="h-8 w-8 text-red-400" />
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
      <p className="text-slate-400 mb-6 max-w-md">
        An unexpected error occurred. Our team has been notified.
      </p>
      {error.digest && (
        <p className="text-xs text-slate-600 mb-6 font-mono">Error ID: {error.digest}</p>
      )}
      <div className="flex gap-3">
        <Button onClick={reset} className="bg-primary text-primary-foreground hover:bg-primary/90">
          Try again
        </Button>
        <Button variant="outline" onClick={() => window.location.href = '/dashboard'}
          className="border-slate-700 text-slate-300 hover:bg-slate-800">
          Go to dashboard
        </Button>
      </div>
    </div>
  )
}
