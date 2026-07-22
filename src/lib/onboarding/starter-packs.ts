/**
 * Industry starter packs. Each pre-configures a pipeline, a few quick
 * replies, appointment types, and tags so a new account is useful on day
 * one instead of empty. Applied via POST /api/onboarding/starter-pack.
 */

export interface StarterPack {
  slug: string
  name: string
  emoji: string
  description: string
  pipeline: { name: string; stages: { name: string; color: string }[] }
  quickReplies: { shortcut: string; message: string }[]
  appointmentTypes: { name: string; description: string; duration_min: number }[]
  tags: { name: string; color: string }[]
}

export const STARTER_PACKS: StarterPack[] = [
  {
    slug: 'clinic',
    name: 'Clinic / Healthcare',
    emoji: '🩺',
    description: 'Appointments, reminders, and patient intake.',
    pipeline: {
      name: 'Patient Journey',
      stages: [
        { name: 'New Enquiry', color: '#3b82f6' },
        { name: 'Appointment Booked', color: '#8b5cf6' },
        { name: 'Visited', color: '#f59e0b' },
        { name: 'Follow-up', color: '#10b981' },
      ],
    },
    quickReplies: [
      { shortcut: 'hours', message: 'Our clinic is open Mon–Sat, 9am–6pm. How can we help you today?' },
      { shortcut: 'book', message: 'I can help you book an appointment. What day works best for you?' },
      { shortcut: 'remind', message: 'This is a reminder of your appointment tomorrow. Reply CONFIRM to confirm.' },
    ],
    appointmentTypes: [
      { name: 'General Consultation', description: 'Standard check-up', duration_min: 30 },
      { name: 'Follow-up Visit', description: 'Review and follow-up', duration_min: 15 },
    ],
    tags: [
      { name: 'New Patient', color: '#3b82f6' },
      { name: 'Returning', color: '#10b981' },
    ],
  },
  {
    slug: 'salon',
    name: 'Salon / Spa',
    emoji: '💇',
    description: 'Bookings, service menu, and rebooking nudges.',
    pipeline: {
      name: 'Booking Pipeline',
      stages: [
        { name: 'Enquiry', color: '#ec4899' },
        { name: 'Booked', color: '#8b5cf6' },
        { name: 'Served', color: '#f59e0b' },
        { name: 'Rebook', color: '#10b981' },
      ],
    },
    quickReplies: [
      { shortcut: 'menu', message: 'Here are our services and prices: [link]. What would you like to book?' },
      { shortcut: 'book', message: 'Lovely! What service and time would you like?' },
      { shortcut: 'rebook', message: 'It\'s been a while! Ready to book your next appointment? We have slots this week.' },
    ],
    appointmentTypes: [
      { name: 'Haircut', description: 'Cut & style', duration_min: 45 },
      { name: 'Color', description: 'Full color', duration_min: 90 },
      { name: 'Spa Treatment', description: 'Relaxation package', duration_min: 60 },
    ],
    tags: [
      { name: 'VIP', color: '#ec4899' },
      { name: 'New Client', color: '#3b82f6' },
    ],
  },
  {
    slug: 'store',
    name: 'Store / E-commerce',
    emoji: '🛍️',
    description: 'Orders, catalog, and abandoned-cart recovery.',
    pipeline: {
      name: 'Sales Pipeline',
      stages: [
        { name: 'Lead', color: '#3b82f6' },
        { name: 'Cart', color: '#f59e0b' },
        { name: 'Paid', color: '#10b981' },
        { name: 'Repeat', color: '#8b5cf6' },
      ],
    },
    quickReplies: [
      { shortcut: 'catalog', message: 'Here\'s our catalog: [link]. Tap a product and I\'ll send a payment link!' },
      { shortcut: 'track', message: 'Please share your order number and I\'ll check the status for you.' },
      { shortcut: 'cart', message: 'You left some items in your cart — want me to send a secure checkout link?' },
    ],
    appointmentTypes: [],
    tags: [
      { name: 'Hot Lead', color: '#ef4444' },
      { name: 'Repeat Buyer', color: '#10b981' },
    ],
  },
  {
    slug: 'coaching',
    name: 'Coaching / Consulting',
    emoji: '🎯',
    description: 'Discovery calls, programs, and check-ins.',
    pipeline: {
      name: 'Client Pipeline',
      stages: [
        { name: 'Lead', color: '#3b82f6' },
        { name: 'Discovery Call', color: '#8b5cf6' },
        { name: 'Enrolled', color: '#10b981' },
        { name: 'Alumni', color: '#f59e0b' },
      ],
    },
    quickReplies: [
      { shortcut: 'call', message: 'I\'d love to learn about your goals. Can we set up a free 20-min discovery call?' },
      { shortcut: 'program', message: 'Here\'s an overview of the program: [link]. Happy to answer any questions!' },
      { shortcut: 'checkin', message: 'Quick check-in — how are you progressing on this week\'s goals?' },
    ],
    appointmentTypes: [
      { name: 'Discovery Call', description: 'Free intro call', duration_min: 20 },
      { name: 'Coaching Session', description: '1:1 session', duration_min: 60 },
    ],
    tags: [
      { name: 'Prospect', color: '#3b82f6' },
      { name: 'Active Client', color: '#10b981' },
    ],
  },
]

export function getStarterPack(slug: string): StarterPack | null {
  return STARTER_PACKS.find((p) => p.slug === slug) ?? null
}
