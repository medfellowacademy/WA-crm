-- ============================================================
-- Migration 032 — Autonomous AI Agent
--
-- Per-org config for an autonomous agent that can reply to
-- customers directly (not just suggest replies to a human agent).
-- The cron at /api/cron/ai-agent picks up eligible conversations
-- and, if enabled, sends a Claude-generated reply automatically.
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_agent_config (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  is_enabled            BOOLEAN NOT NULL DEFAULT false,
  system_prompt         TEXT NOT NULL DEFAULT 'You are a helpful WhatsApp customer support agent. Be concise, warm, and professional. Reply in the same language the customer used. Keep replies short (2-4 sentences) unless more detail is clearly needed.',
  handoff_message       TEXT NOT NULL DEFAULT 'Let me get a member of our team to help you with that.',
  handoff_keywords      TEXT[] NOT NULL DEFAULT ARRAY['agent', 'human', 'representative', 'manager'],
  auto_assign_on_handoff BOOLEAN NOT NULL DEFAULT true,
  model                 TEXT NOT NULL DEFAULT 'claude-opus-4-8',
  max_autonomous_turns  INTEGER NOT NULL DEFAULT 6,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_agent_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read ai_agent_config"
  ON ai_agent_config FOR SELECT
  USING (org_id = current_org_id());

-- Track how many autonomous turns the agent has taken on a conversation,
-- so we can hand off to a human after max_autonomous_turns.
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS ai_agent_turns INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_agent_active BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_conversations_ai_agent_active
  ON conversations(org_id, ai_agent_active) WHERE ai_agent_active = true;
