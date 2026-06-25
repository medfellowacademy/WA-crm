import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/whatsapp/encryption'

const META_API_VERSION = 'v21.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

/**
 * POST /api/whatsapp/templates/submit
 * Submits a locally-saved template to Meta for approval.
 * Body: { template_id: string }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { template_id } = await request.json()
    if (!template_id) return NextResponse.json({ error: 'template_id required' }, { status: 400 })

    // Load the template
    const { data: template, error: tErr } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', template_id)
      .single()

    if (tErr || !template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    if (template.status === 'Approved') return NextResponse.json({ error: 'Template is already approved' }, { status: 400 })

    // Load WhatsApp config
    const { data: config, error: cfgErr } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (cfgErr || !config) {
      return NextResponse.json({
        error: 'WhatsApp not configured. Connect your WhatsApp Business account in Settings first.',
      }, { status: 400 })
    }

    if (!config.waba_id) {
      return NextResponse.json({
        error: 'WABA ID missing. Re-connect your WhatsApp account in Settings.',
      }, { status: 400 })
    }

    const accessToken = decrypt(config.access_token)

    // Build the components array for Meta's API
    const components: object[] = []

    if (template.header_type && template.header_type !== 'none') {
      if (template.header_type === 'text') {
        components.push({
          type: 'HEADER',
          format: 'TEXT',
          text: template.header_content ?? '',
        })
      } else {
        // image / video / document — Meta needs a media handle or example
        components.push({
          type: 'HEADER',
          format: template.header_type.toUpperCase(),
          example: { header_handle: ['PLACEHOLDER'] },
        })
      }
    }

    if (template.body_text) {
      // Extract variable count from {{1}}, {{2}} etc.
      const vars = template.body_text.match(/\{\{\d+\}\}/g) ?? []
      const bodyComponent: Record<string, unknown> = {
        type: 'BODY',
        text: template.body_text,
      }
      if (vars.length > 0) {
        bodyComponent.example = {
          body_text: [vars.map(() => 'example_value')],
        }
      }
      components.push(bodyComponent)
    }

    if (template.footer_text) {
      components.push({ type: 'FOOTER', text: template.footer_text })
    }

    // Submit to Meta
    const metaRes = await fetch(`${META_API_BASE}/${config.waba_id}/message_templates`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: template.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        category: template.category.toUpperCase(),
        language: template.language,
        components,
      }),
    })

    const metaBody = await metaRes.json()

    if (!metaRes.ok) {
      const errMsg = metaBody?.error?.error_user_msg
        ?? metaBody?.error?.message
        ?? `Meta API error ${metaRes.status}`
      return NextResponse.json({ error: errMsg }, { status: 502 })
    }

    // Update local status to Pending and store Meta's template id
    await supabase
      .from('message_templates')
      .update({
        status: 'Pending',
        meta_template_id: metaBody.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', template_id)

    return NextResponse.json({ success: true, meta_id: metaBody.id, status: 'Pending' })
  } catch (err) {
    console.error('[templates/submit]', err)
    return NextResponse.json({ error: 'Failed to submit template' }, { status: 500 })
  }
}
