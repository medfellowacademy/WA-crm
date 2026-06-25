-- ============================================================
-- Integrations: Outbound Webhooks
--
-- webhook_endpoints: URLs to call when events happen in the app.
-- Each row is owned by an org. When an event fires, the app
-- POSTs a JSON payload to every active endpoint that subscribes
-- to that event. This is the foundation for Zapier, Make, and
-- custom integrations.
--
-- Supported events (stored in the `events` JSONB array):
--   new_message        — inbound message received
--   new_contact        — contact created
--   conversation_opened / conversation_closed
--   deal_created / deal_updated
--   broadcast_sent
--
-- Also adds ai_reply_config to orgs for OpenAI integration.
-- ============================================================

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  url         TEXT NOT NULL,
  secret      TEXT,              -- HMAC-SHA256 signing secret (encrypted)
  events      JSONB NOT NULL DEFAULT '[]',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  last_fired_at  TIMESTAMPTZ,
  last_status    INTEGER,        -- HTTP status of last delivery attempt
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_org    ON webhook_endpoints(org_id);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_active ON webhook_endpoints(org_id, is_active) WHERE is_active = true;

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members can manage webhooks" ON webhook_endpoints;
CREATE POLICY "Org members can manage webhooks" ON webhook_endpoints FOR ALL
  USING (org_id = public.current_org_id());

DROP TRIGGER IF EXISTS set_updated_at ON webhook_endpoints;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- OpenAI config per org
-- ============================================================
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS openai_api_key TEXT,
  ADD COLUMN IF NOT EXISTS openai_model   TEXT DEFAULT 'gpt-4o-mini',
  ADD COLUMN IF NOT EXISTS ai_system_prompt TEXT;
