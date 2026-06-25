import { createClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/whatsapp/encryption'
import { getOrgIdForUser } from '@/lib/org'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface Message { role: 'system' | 'user' | 'assistant'; content: string }

/**
 * Generate an AI reply using the org's OpenAI config.
 * Fetches the last N messages from the conversation as context.
 * Returns the generated text or throws if not configured.
 */
export async function generateAiReply({
  userId,
  conversationId,
  inboundText,
}: {
  userId: string
  conversationId: string
  inboundText: string
}): Promise<string> {
  const orgId = await getOrgIdForUser(userId)
  if (!orgId) throw new Error('No org found for user')

  const { data: org } = await db()
    .from('organizations')
    .select('openai_api_key, openai_model, ai_system_prompt')
    .eq('id', orgId)
    .single()

  if (!org?.openai_api_key) throw new Error('OpenAI not configured for this org')

  const apiKey = decrypt(org.openai_api_key)
  const model  = org.openai_model ?? 'gpt-4o-mini'
  const systemPrompt = org.ai_system_prompt ??
    'You are a helpful WhatsApp customer support agent. Be concise and friendly. Reply in the same language the customer used.'

  // Fetch last 10 messages for context
  const { data: history } = await db()
    .from('messages')
    .select('sender_type, content_text')
    .eq('conversation_id', conversationId)
    .not('content_text', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10)

  const historyMessages: Message[] = (history ?? [])
    .reverse()
    .map(m => ({
      role: m.sender_type === 'customer' ? 'user' : 'assistant',
      content: m.content_text ?? '',
    }))

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    ...historyMessages,
    { role: 'user', content: inboundText },
  ]

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: 500, temperature: 0.7 }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI error ${res.status}: ${err}`)
  }

  const json = await res.json() as { choices: { message: { content: string } }[] }
  const reply = json.choices?.[0]?.message?.content?.trim()
  if (!reply) throw new Error('OpenAI returned empty response')
  return reply
}
