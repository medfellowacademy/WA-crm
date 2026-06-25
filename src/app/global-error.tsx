'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Global Error]', error)
  }, [error])

  return (
    <html>
      <body style={{ background: '#020817', margin: 0, fontFamily: 'sans-serif' }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh', color: '#fff', textAlign: 'center', padding: '1rem'
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Critical Error
          </h1>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
            The application encountered a critical error. Please reload the page.
          </p>
          {error.digest && (
            <p style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '1.5rem', fontFamily: 'monospace' }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              background: '#7c3aed', color: '#fff', border: 'none',
              padding: '0.5rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem'
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
