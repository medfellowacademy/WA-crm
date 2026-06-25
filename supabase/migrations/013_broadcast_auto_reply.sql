-- ============================================================
-- Migration 013: Broadcast Auto-Reply Configuration
-- ============================================================
-- Adds auto-reply support to broadcasts. When a recipient clicks
-- a button in a template response, automatically send a follow-up
-- message (template or text).

ALTER TABLE broadcasts ADD COLUMN auto_reply_enabled BOOLEAN DEFAULT false;
ALTER TABLE broadcasts ADD COLUMN auto_reply_type TEXT CHECK (auto_reply_type IN ('template', 'text')) DEFAULT 'template';
ALTER TABLE broadcasts ADD COLUMN auto_reply_template_name TEXT;
ALTER TABLE broadcasts ADD COLUMN auto_reply_template_language TEXT DEFAULT 'en_US';
ALTER TABLE broadcasts ADD COLUMN auto_reply_text TEXT;
ALTER TABLE broadcasts ADD COLUMN auto_reply_button_ids TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Track button response events for campaigns
CREATE TABLE IF NOT EXISTS broadcast_button_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  broadcast_recipient_id UUID NOT NULL REFERENCES broadcast_recipients(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  button_id TEXT NOT NULL,
  button_title TEXT,
  responded_at TIMESTAMP DEFAULT NOW(),
  auto_reply_sent BOOLEAN DEFAULT false,
  auto_reply_message_id TEXT,
  auto_reply_error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups during auto-reply processing
CREATE INDEX IF NOT EXISTS idx_broadcast_button_responses_broadcast_id
  ON broadcast_button_responses(broadcast_id, responded_at DESC);

CREATE INDEX IF NOT EXISTS idx_broadcast_button_responses_contact_id
  ON broadcast_button_responses(contact_id, responded_at DESC);

-- Track auto-reply delivery separately
ALTER TABLE broadcast_recipients ADD COLUMN IF NOT EXISTS auto_reply_message_id TEXT;
ALTER TABLE broadcast_recipients ADD COLUMN IF NOT EXISTS auto_reply_status TEXT CHECK (auto_reply_status IN ('pending', 'sent', 'delivered', 'read', 'failed')) DEFAULT NULL;
ALTER TABLE broadcast_recipients ADD COLUMN IF NOT EXISTS auto_reply_sent_at TIMESTAMP;

-- Create RLS policies for auto-reply tables
ALTER TABLE broadcast_button_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own broadcast button responses"
  ON broadcast_button_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert button responses"
  ON broadcast_button_responses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update button responses"
  ON broadcast_button_responses FOR UPDATE
  USING (true)
  WITH CHECK (true);
