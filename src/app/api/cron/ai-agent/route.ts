import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { resolveWaCredentials } from '@/lib/whatsapp/credentials'
import { sendTextMessage } from '@/lib/whatsapp/meta-api'
import { sanitizePhoneForMeta, isValidE164 } from '@/lib/whatsapp/phone-utils'

/**
 * Autonomous AI Agent Cron — runs every minute.
 *
 * For orgs with ai_agent_config.is_enabled = true, finds open,
 * unassigned conversations whose most recent message is an unanswered
 * inbound customer message, and lets Claude reply directly on the
 * org's behalf. Hands off to a human agent when the customer asks
 * for one, or after max_autonomous_turns.
 */

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface HistoryMessage {
  sender_type: string
  content_text: string | null
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ skipped: 'ANTHROPIC_API_KEY not configured' })
  }

  const db = supabaseAdmin()
  const anthropic = new Anthropic({ apiKey })

  const { data: configs } = await db
    .from('ai_agent_config')
    .select('*')
    .eq('is_enabled', true)

  if (!configs?.length) {
    return NextResponse.json({ processed: 0 })
  }

  let handled = 0
  let handedOff = 0

  for (const config of configs) {
    // Eligible: open conversations, not already handed off, unassigned,
    // where the last message is inbound from the customer (unanswered).
    const { data: conversations } = await db
      .from('conversations')
      .select('id, org_id, whatsapp_number_id, assigned_agent_id, ai_agent_turns, contact:contacts(phone)')
      .eq('org_id', config.org_id)
      .eq('status', 'open')
      .is('assigned_agent_id', null)
      .lt('ai_agent_turns', config.max_autonomous_turns)

    for (const conv of conversations ?? []) {
      const { data: lastMsg } = await db
        .from('messages')
        .select('sender_type, is_internal, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!lastMsg || lastMsg.sender_type !== 'customer' || lastMsg.is_internal) continue

      const { data: history } = await db
        .from('messages')
        .select('sender_type, content_text')
        .eq('conversation_id', conv.id)
        .eq('is_internal', false)
        .not('content_text', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20)

      const transcript: HistoryMessage[] = (history ?? []).reverse()
      const inboundText = transcript[transcript.length - 1]?.content_text ?? ''

      const lowered = inboundText.toLowerCase()
      const wantsHuman = (config.handoff_keywords as string[] ?? []).some((kw) =>
        lowered.includes(kw.toLowerCase())
      )

      const phone = (conv.contact as unknown as { phone: string } | null)?.phone
      if (!phone) continue
      const sanitized = sanitizePhoneForMeta(phone)
      if (!isValidE164(sanitized)) continue

      const creds = await resolveWaCredentials(db, conv.org_id, conv.whatsapp_number_id)

      if (wantsHuman) {
        await sendTextMessage({
          phoneNumberId: creds.phoneNumberId,
          accessToken: creds.accessToken,
          to: sanitized,
          text: config.handoff_message,
        })
        await db.from('messages').insert({
          conversation_id: conv.id,
          org_id: conv.org_id,
          sender_type: 'agent',
          content_type: 'text',
          content_text: config.handoff_message,
          status: 'sent',
        })
        await db.from('conversations').update({
          ai_agent_active: false,
          ...(config.auto_assign_on_handoff ? { status: 'pending' } : {}),
        }).eq('id', conv.id)
        handedOff++
        continue
      }

      const claudeMessages = transcript.map((m) => ({
        role: (m.sender_type === 'customer' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content_text ?? '',
      }))

      try {
        const response = await anthropic.messages.create({
          model: config.model || 'claude-opus-4-8',
          max_tokens: 500,
          thinking: { type: 'adaptive' },
          system: config.system_prompt,
          messages: claudeMessages,
        })

        const textBlock = response.content.find((b) => b.type === 'text')
        const reply = textBlock && 'text' in textBlock ? textBlock.text.trim() : null
        if (!reply) continue

        const result = await sendTextMessage({
          phoneNumberId: creds.phoneNumberId,
          accessToken: creds.accessToken,
          to: sanitized,
          text: reply,
        })

        await db.from('messages').insert({
          conversation_id: conv.id,
          org_id: conv.org_id,
          sender_type: 'agent',
          content_type: 'text',
          content_text: reply,
          message_id: result.messageId,
          status: 'sent',
        })

        await db.from('conversations').update({
          ai_agent_active: true,
          ai_agent_turns: (conv.ai_agent_turns ?? 0) + 1,
        }).eq('id', conv.id)

        await db.from('ai_usage').insert({
          org_id: conv.org_id,
          feature: 'autonomous_agent',
          tokens_in: response.usage.input_tokens,
          tokens_out: response.usage.output_tokens,
        })

        handled++
      } catch (err) {
        console.error('[cron/ai-agent] reply failed for conversation', conv.id, err)
      }
    }
  }

  return NextResponse.json({ handled, handedOff })
}
