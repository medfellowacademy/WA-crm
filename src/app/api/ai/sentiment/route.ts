import { NextResponse } from 'next/server'
import { getCurrentOrg } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
    }

    const supabase = await createClient()
    const { org } = await getCurrentOrg()
    const { conversation_id } = await req.json()

    if (!conversation_id) {
      return NextResponse.json({ error: 'conversation_id required' }, { status: 400 })
    }

    // Verify conversation belongs to org
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversation_id)
      .eq('org_id', org.id)
      .maybeSingle()

    if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Get last 15 customer messages
    const { data: msgs } = await supabase
      .from('messages')
      .select('content_text')
      .eq('conversation_id', conversation_id)
      .eq('sender_type', 'customer')
      .eq('is_internal', false)
      .order('created_at', { ascending: false })
      .limit(15)

    if (!msgs?.length) {
      return NextResponse.json({ sentiment: null })
    }

    const transcript = msgs
      .reverse()
      .map((m) => m.content_text)
      .filter(Boolean)
      .join('\n')

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: `Analyze the overall sentiment of these customer messages. Reply with ONLY one word: positive, neutral, or negative.\n\n${transcript}`,
        },
      ],
    })

    const raw = (response.content[0] as { type: string; text: string }).text.trim().toLowerCase()
    const sentiment = (
      ['positive', 'neutral', 'negative'] as const
    ).find((s) => raw.includes(s)) ?? 'neutral'

    // Persist sentiment on the conversation
    await supabase
      .from('conversations')
      .update({ sentiment })
      .eq('id', conversation_id)

    return NextResponse.json({ sentiment })
  } catch (err) {
    console.error('[ai/sentiment]', err)
    return NextResponse.json({ error: 'Failed to analyze sentiment' }, { status: 500 })
  }
}
