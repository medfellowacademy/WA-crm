import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTemplateMessage, sendTextMessage } from '@/lib/whatsapp/meta-api'
import { decrypt } from '@/lib/whatsapp/encryption'
import { sanitizePhoneForMeta, isValidE164 } from '@/lib/whatsapp/phone-utils'
import { resolveWaCredentials } from '@/lib/whatsapp/credentials'
import { supabaseAdmin } from '@/lib/flows/admin-client'

/**
 * Handle button responses from broadcasts and send auto-replies.
 * Called when a webhook event indicates a customer clicked a button.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { broadcastId, contactId, buttonId, buttonTitle } = body

    if (!broadcastId || !contactId || !buttonId) {
      return NextResponse.json(
        { error: 'Missing required fields: broadcastId, contactId, buttonId' },
        { status: 400 }
      )
    }

    // 1. Get the broadcast and auto-reply config
    const { data: broadcast, error: broadcastError } = await supabase
      .from('broadcasts')
      .select('*')
      .eq('id', broadcastId)
      .eq('user_id', user.id)
      .single()

    if (broadcastError || !broadcast) {
      return NextResponse.json(
        { error: 'Broadcast not found' },
        { status: 404 }
      )
    }

    // Check if auto-reply is enabled
    if (!broadcast.auto_reply_enabled) {
      return NextResponse.json(
        { success: true, message: 'Auto-reply not enabled for this broadcast' }
      )
    }

    // Check if this button is configured for auto-reply
    const buttonIds = broadcast.auto_reply_button_ids || []
    if (!buttonIds.includes(buttonId)) {
      return NextResponse.json(
        { success: true, message: 'Button not configured for auto-reply' }
      )
    }

    // 2. Get contact info (phone number)
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('user_id', user.id)
      .single()

    if (contactError || !contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    // 3. Get broadcast recipient to track auto-reply
    const { data: recipient, error: recipientError } = await supabase
      .from('broadcast_recipients')
      .select('*')
      .eq('broadcast_id', broadcastId)
      .eq('contact_id', contactId)
      .single()

    if (recipientError || !recipient) {
      return NextResponse.json(
        { error: 'Broadcast recipient not found' },
        { status: 404 }
      )
    }

    // 4. Resolve WhatsApp credentials — multi-WABA or legacy
    let phoneNumberId: string
    let accessToken: string

    if (broadcast.org_id) {
      try {
        const creds = await resolveWaCredentials(supabaseAdmin(), broadcast.org_id)
        phoneNumberId = creds.phoneNumberId
        accessToken   = creds.accessToken
      } catch {
        return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 400 })
      }
    } else {
      const { data: config, error: configError } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (configError || !config) {
        return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 400 })
      }
      phoneNumberId = config.phone_number_id
      accessToken   = decrypt(config.access_token)
    }

    const sanitized = sanitizePhoneForMeta(contact.phone_number)

    if (!isValidE164(sanitized)) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      )
    }

    // 5. Send auto-reply based on configuration
    let messageId: string | null = null
    let autoReplyError: string | null = null

    try {
      if (broadcast.auto_reply_type === 'template') {
        if (!broadcast.auto_reply_template_name) {
          throw new Error('No template configured for auto-reply')
        }

        const result = await sendTemplateMessage({
          phoneNumberId,
          accessToken,
          to: sanitized,
          templateName: broadcast.auto_reply_template_name,
          language: broadcast.auto_reply_template_language || 'en_US',
          contextMessageId: recipient.whatsapp_message_id,
        })
        messageId = result.messageId
      } else if (broadcast.auto_reply_type === 'text') {
        if (!broadcast.auto_reply_text) {
          throw new Error('No message text configured for auto-reply')
        }

        const result = await sendTextMessage({
          phoneNumberId,
          accessToken,
          to: sanitized,
          text: broadcast.auto_reply_text,
          contextMessageId: recipient.whatsapp_message_id,
        })
        messageId = result.messageId
      } else {
        throw new Error(`Unknown auto-reply type: ${broadcast.auto_reply_type}`)
      }
    } catch (err) {
      autoReplyError = err instanceof Error ? err.message : String(err)
      console.error('[auto-reply] Send failed:', autoReplyError)
    }

    // 6. Record the button response and auto-reply
    const { error: responseError } = await supabase
      .from('broadcast_button_responses')
      .insert({
        user_id: user.id,
        broadcast_id: broadcastId,
        broadcast_recipient_id: recipient.id,
        contact_id: contactId,
        button_id: buttonId,
        button_title: buttonTitle,
        responded_at: new Date().toISOString(),
        auto_reply_sent: !!messageId,
        auto_reply_message_id: messageId,
        auto_reply_error: autoReplyError,
      })

    if (responseError) {
      console.error('[auto-reply] Failed to record response:', responseError)
    }

    // 7. Update broadcast recipient auto-reply status
    if (messageId) {
      const { error: updateError } = await supabase
        .from('broadcast_recipients')
        .update({
          auto_reply_message_id: messageId,
          auto_reply_status: 'sent',
          auto_reply_sent_at: new Date().toISOString(),
        })
        .eq('id', recipient.id)

      if (updateError) {
        console.error('[auto-reply] Failed to update recipient:', updateError)
      }
    } else if (autoReplyError) {
      const { error: updateError } = await supabase
        .from('broadcast_recipients')
        .update({
          auto_reply_status: 'failed',
        })
        .eq('id', recipient.id)

      if (updateError) {
        console.error('[auto-reply] Failed to update recipient failure:', updateError)
      }
    }

    if (autoReplyError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to send auto-reply',
          error: autoReplyError,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Auto-reply sent successfully',
      messageId,
    })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error('[auto-reply] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
