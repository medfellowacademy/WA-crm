import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrg } from '@/lib/org'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  try {
    const { conversation_id } = await req.json()
    if (!conversation_id) {
      return NextResponse.json({ error: 'conversation_id required' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI not configured. Add ANTHROPIC_API_KEY to your environment.' }, { status: 503 })
    }

    const supabase = await createClient()
    const { org, userId } = await getCurrentOrg()

    // Fetch last 20 messages + contact info
    const { data: conv } = await supabase
      .from('conversations')
      .select('*, contact:contacts(name, phone)')
      .eq('id', conversation_id)
      .eq('org_id', org.id)
      .maybeSingle()

    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

    const { data: messages } = await supabase
      .from('messages')
      .select('sender_type, content_text, content_type, created_at, is_internal')
      .eq('conversation_id', conversation_id)
      .eq('is_internal', false)
      .order('created_at', { ascending: false })
      .limit(20)

    const recentMessages = (messages ?? []).reverse()

    if (recentMessages.length === 0) {
      return NextResponse.json({ error: 'No messages to suggest from' }, { status: 400 })
    }

    // Build conversation transcript
    const transcript = recentMessages
      .filter((m) => m.content_text)
      .map((m) => {
        const role = m.sender_type === 'customer' ? 'Customer' : 'Agent'
        return `${role}: ${m.content_text}`
      })
      .join('\n')

    const contactName = conv.contact?.name || conv.contact?.phone || 'the customer'

    const anthropic = new Anthropic({ apiKey })

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `You are an expert customer support agent writing WhatsApp replies.
Write a concise, warm, professional reply in the same language the customer used.
Keep it under 3 sentences. Be direct and helpful. Do NOT use greetings like "Hello" or sign-offs.
Output ONLY the reply text, nothing else.`,
      messages: [
        {
          role: 'user',
          content: `Here is the WhatsApp conversation with ${contactName}:\n\n${transcript}\n\nWrite the next agent reply:`,
        },
      ],
    })

    const suggestion = response.content[0]?.type === 'text'
      ? response.content[0].text.trim()
      : null

    if (!suggestion) {
      return NextResponse.json({ error: 'Failed to generate suggestion' }, { status: 500 })
    }

    // Track usage (non-blocking)
    supabase.from('ai_usage').insert({
      org_id: org.id,
      user_id: userId,
      feature: 'suggest_reply',
      tokens_in: response.usage.input_tokens,
      tokens_out: response.usage.output_tokens,
    }).then(() => {})

    return NextResponse.json({ suggestion })
  } catch (err) {
    console.error('[ai/suggest]', err)
    const msg = err instanceof Error ? err.message : 'AI error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
