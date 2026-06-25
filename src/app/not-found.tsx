import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center">
      <p className="text-8xl font-bold text-slate-800 mb-4">404</p>
      <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
      <p className="text-slate-400 mb-8">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
        <Link href="/dashboard">Go to dashboard</Link>
      </Button>
    </div>
  )
}
