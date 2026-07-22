import type { MetadataRoute } from 'next'

/**
 * PWA manifest — makes WaCRM installable so agents can reply from their
 * phone home screen. SVG icon with sizes "any" satisfies modern Chrome's
 * installability criteria without shipping binary PNGs.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WaCRM — WhatsApp CRM',
    short_name: 'WaCRM',
    description: 'Manage WhatsApp conversations, contacts, and broadcasts on the go.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#16a34a',
    orientation: 'portrait',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}
