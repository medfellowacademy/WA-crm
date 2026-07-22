import { NextResponse } from 'next/server'
import { getCurrentOrg, adminClient } from '@/lib/org'
import { getStarterPack, STARTER_PACKS } from '@/lib/onboarding/starter-packs'

/** GET — list available packs (for the picker UI). */
export async function GET() {
  return NextResponse.json({
    packs: STARTER_PACKS.map((p) => ({
      slug: p.slug, name: p.name, emoji: p.emoji, description: p.description,
      stages: p.pipeline.stages.length, quickReplies: p.quickReplies.length,
      appointmentTypes: p.appointmentTypes.length,
    })),
  })
}

/**
 * POST { slug } — seeds the chosen industry pack: a pipeline + stages,
 * quick replies, appointment types, and tags. Idempotent-ish: quick
 * replies upsert on (org, shortcut); other rows are additive.
 */
export async function POST(request: Request) {
  try {
    const { org, userId } = await getCurrentOrg()
    const { slug } = await request.json()
    const pack = getStarterPack(slug)
    if (!pack) return NextResponse.json({ error: 'Unknown starter pack' }, { status: 400 })

    const db = adminClient()

    // Pipeline + stages.
    const { data: pipeline } = await db
      .from('pipelines')
      .insert({ org_id: org.id, user_id: userId, name: pack.pipeline.name })
      .select('id')
      .single()
    if (pipeline) {
      await db.from('pipeline_stages').insert(
        pack.pipeline.stages.map((s, i) => ({
          pipeline_id: pipeline.id, name: s.name, position: i, color: s.color,
        })),
      )
    }

    // Quick replies (upsert so re-applying doesn't error on the unique key).
    if (pack.quickReplies.length) {
      await db.from('quick_replies').upsert(
        pack.quickReplies.map((q) => ({
          org_id: org.id, shortcut: q.shortcut, message: q.message, created_by: userId,
        })),
        { onConflict: 'org_id,shortcut' },
      )
    }

    // Appointment types.
    if (pack.appointmentTypes.length) {
      await db.from('appointment_types').insert(
        pack.appointmentTypes.map((a) => ({
          org_id: org.id, name: a.name, description: a.description, duration_min: a.duration_min,
        })),
      )
    }

    // Tags.
    if (pack.tags.length) {
      await db.from('tags').insert(
        pack.tags.map((t) => ({ org_id: org.id, user_id: userId, name: t.name, color: t.color })),
      )
    }

    return NextResponse.json({ ok: true, applied: pack.slug })
  } catch (err) {
    console.error('[onboarding/starter-pack]', err)
    return NextResponse.json({ error: 'Failed to apply starter pack' }, { status: 500 })
  }
}
