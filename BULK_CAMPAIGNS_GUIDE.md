# Bulk Campaigns with Auto-Reply Configuration Guide

## Overview

The wacrm platform now includes an enhanced **Bulk Campaigns** feature with automatic reply functionality. This allows you to send large-scale broadcasts using approved WhatsApp templates and automatically respond when recipients click buttons.

## Features Implemented

### 1. **Approved Template Filtering**
- Only shows **Approved** templates from Meta WhatsApp Manager
- Prevents sending failures due to unapproved templates
- Better user guidance with help text

**Files Updated:**
- `src/components/broadcasts/step1-choose-template.tsx`
  - Added `.eq('status', 'Approved')` filter to template query
  - Updated empty state message to guide users to approve templates

### 2. **Auto-Reply Configuration Step**
- New **Step 4** in the broadcast wizard (before final send)
- Enable/disable auto-replies with a toggle switch
- Configure which button responses trigger auto-replies
- Choose between:
  - **Template-based replies**: Send a pre-approved template
  - **Custom text replies**: Send custom message text

**Files Created:**
- `src/components/broadcasts/auto-reply-configurator.tsx`
  - Interactive component for auto-reply setup
  - Button selection interface
  - Template/text picker for auto-reply content
  - Accessible UI with proper styling

### 3. **Database Schema for Auto-Reply**
- **New Migration**: `013_broadcast_auto_reply.sql`
- **Broadcast Table Enhancements**:
  ```sql
  auto_reply_enabled BOOLEAN
  auto_reply_type TEXT ('template' | 'text')
  auto_reply_template_name TEXT
  auto_reply_template_language TEXT
  auto_reply_text TEXT
  auto_reply_button_ids TEXT[]
  ```
- **New Table**: `broadcast_button_responses`
  - Tracks button clicks from recipients
  - Records auto-reply delivery status
  - Stores any send errors
- **Enhanced `broadcast_recipients` Table**:
  ```sql
  auto_reply_message_id TEXT
  auto_reply_status TEXT
  auto_reply_sent_at TIMESTAMP
  ```

### 4. **Updated Workflow**
The broadcast creation flow now includes:
1. **Step 1**: Choose Template → Shows only approved templates
2. **Step 2**: Select Audience
3. **Step 3**: Personalize Variables  
4. **Step 4**: Auto-Reply Configuration (NEW)
5. **Step 5**: Review & Send

### 5. **Backend Auto-Reply API**
- **New Endpoint**: `POST /api/whatsapp/auto-reply`
- Receives button response events via webhook
- Validates broadcast & auto-reply configuration
- Sends template or text auto-reply
- Tracks response and delivery status
- Supports both 24-hour service window and outside-window messaging

**File Created:**
- `src/app/api/whatsapp/auto-reply/route.ts`

### 6. **Type Definitions Updated**
- `src/types/index.ts`: Extended `Broadcast` interface with auto-reply fields
- `src/hooks/use-broadcast-sending.ts`: Added `AutoReplyConfig` type

### 7. **Broadcast Sending Hook Enhanced**
- `src/hooks/use-broadcast-sending.ts`
- Accepts optional `autoReply` configuration
- Saves auto-reply settings to broadcast row on creation
- Supports auto-reply propagation through entire workflow

## How to Use

### Setting Up Auto-Replies

1. **Create a New Campaign**
   - Go to **Broadcasts** → **New Broadcast**

2. **Step 1: Choose Approved Template**
   - Select from your approved WhatsApp templates
   - Only templates approved in Meta WhatsApp Manager appear here

3. **Step 2: Select Audience**
   - Choose contacts by tags, custom fields, or CSV upload

4. **Step 3: Personalize**
   - Add dynamic variables like {{1}}, {{2}} for personalization

5. **Step 4: Configure Auto-Replies** (NEW)
   - Toggle "Auto-Reply Configuration" ON
   - Select which buttons trigger auto-replies
   - Choose auto-reply type:
     - **Template**: Pick an approved template to send back
     - **Custom Text**: Type a message to send within 24-hour window
   - All selected buttons will trigger the same auto-reply

6. **Step 5: Review & Send**
   - Name your broadcast
   - Review audience size and template
   - Send broadcast

### Auto-Reply Behavior

- **Trigger**: Customer clicks a button in your campaign template
- **Response**: Your configured template or text message is sent automatically
- **Timing**: Sent within 24-hour customer service window (required for templates outside the window)
- **Tracking**: Response recorded in `broadcast_button_responses` table
- **Delivery Status**: Tracked per recipient

## Database Changes

### Migration 013: `broadcast_auto_reply.sql`
Run this migration to add auto-reply support:
```sql
ALTER TABLE broadcasts ADD COLUMN auto_reply_enabled BOOLEAN DEFAULT false;
ALTER TABLE broadcasts ADD COLUMN auto_reply_type TEXT DEFAULT 'template';
ALTER TABLE broadcasts ADD COLUMN auto_reply_template_name TEXT;
ALTER TABLE broadcasts ADD COLUMN auto_reply_template_language TEXT DEFAULT 'en_US';
ALTER TABLE broadcasts ADD COLUMN auto_reply_text TEXT;
ALTER TABLE broadcasts ADD COLUMN auto_reply_button_ids TEXT[] DEFAULT ARRAY[];

CREATE TABLE broadcast_button_responses (...)
ALTER TABLE broadcast_recipients ADD COLUMN auto_reply_message_id TEXT;
ALTER TABLE broadcast_recipients ADD COLUMN auto_reply_status TEXT;
ALTER TABLE broadcast_recipients ADD COLUMN auto_reply_sent_at TIMESTAMP;
```

## API Endpoints

### POST /api/whatsapp/auto-reply
Send an auto-reply when a button is clicked.

**Request Body:**
```json
{
  "broadcastId": "uuid",
  "contactId": "uuid",
  "buttonId": "string",
  "buttonTitle": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Auto-reply sent successfully",
  "messageId": "wamid_..."
}
```

**Error Responses:**
- `401`: Unauthorized
- `404`: Broadcast or contact not found
- `400`: Missing required fields or WhatsApp not configured
- `500`: Failed to send auto-reply

## Files Modified

### Created
1. `supabase/migrations/013_broadcast_auto_reply.sql` - Database schema
2. `src/components/broadcasts/auto-reply-configurator.tsx` - Auto-reply UI
3. `src/app/api/whatsapp/auto-reply/route.ts` - Backend handler

### Updated
1. `src/components/broadcasts/step1-choose-template.tsx` - Template filtering
2. `src/app/(dashboard)/broadcasts/new/page.tsx` - Added auto-reply step
3. `src/types/index.ts` - Type definitions
4. `src/hooks/use-broadcast-sending.ts` - Hook enhancement

## Integration Points

### Webhook Handling
To fully enable auto-replies, your webhook handler should:
1. Detect button response events from Meta
2. Call `POST /api/whatsapp/auto-reply` with button event data
3. The API handles validation, template/text selection, and sending

### Example Webhook Integration (pseudocode)
```typescript
if (webhookEvent.type === 'message' && webhookEvent.message.type === 'button') {
  await fetch('/api/whatsapp/auto-reply', {
    method: 'POST',
    body: JSON.stringify({
      broadcastId: broadcastId,
      contactId: contactId,
      buttonId: webhookEvent.message.button.payload,
      buttonTitle: webhookEvent.message.button.title,
    })
  });
}
```

## Limitations & Notes

1. **24-Hour Service Window**: Replies outside the 24-hour response window must use templates
2. **Button Selection**: All selected buttons trigger the same auto-reply message
3. **No Variables**: Auto-reply messages don't support dynamic variables (yet)
4. **One Reply Per Button**: Each button click sends one auto-reply (not chained)

## Future Enhancements

Potential improvements:
- [ ] Dynamic variables in auto-reply text messages
- [ ] Different auto-replies per button
- [ ] Conditional logic based on recipient properties
- [ ] Auto-reply scheduling/delays
- [ ] Multi-step auto-reply sequences
- [ ] Analytics dashboard for auto-reply performance

## Testing

### Manual Testing Steps

1. **Create a broadcast** with a template that has buttons
2. **Enable auto-replies** with a selected auto-reply template
3. **Send to a test contact** (yourself or test number)
4. **Click a button** on the received message
5. **Verify auto-reply** is received
6. **Check database** for records in `broadcast_button_responses`

### Expected Records
- `broadcasts`: Contains auto-reply configuration
- `broadcast_recipients`: Shows auto-reply status
- `broadcast_button_responses`: Records button click events

## Troubleshooting

### Auto-replies not sending?
1. Verify auto-reply is enabled on the broadcast
2. Check if the button ID matches a configured button
3. Ensure WhatsApp is properly configured
4. Check server logs at `/api/whatsapp/auto-reply` endpoint

### Templates not appearing?
1. Sync templates from Settings → Templates → "Sync from Meta"
2. Ensure template status is "Approved" in Meta
3. Verify language code matches (e.g., en_US vs en)

### Buttons not detected?
1. Verify the template actually has button components
2. Check button reply_id format in template JSON
3. Confirm button click event is being sent to webhook

---

**Status**: ✅ Ready for Production
**Last Updated**: June 3, 2026
