-- ============================================================
-- Migration 027: Public REST API keys + Click-to-WhatsApp attribution
--
-- Two competitive-gap features:
--   1. api_keys — token auth for the public /api/v1/* surface. This is
--      what Zapier / Make / n8n / Google Sheets / custom integrations use
--      to perform ACTIONS (the inbound half; webhook_endpoints from 017
--      is the outbound/trigger half).
--   2. ctwa_referrals — captures the `referral` object Meta attaches to
--      inbound messages that originated from a Click-to-WhatsApp ad, so
--      conversations (and the revenue from migration 026) can be
--      attributed back to the ad that drove them.
-- ============================================================

-- ── API keys ────────────────────────────────────────────────
-- Only the SHA-256 hash of the key is stored; the plaintext is shown
-- once at creation and never again (same model as Stripe/GitHub).
CREATE TABLE IF NOT EXISTS api_keys (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  key_prefix  TEXT NOT NULL,              -- e.g. "wacrm_live_ab12cd34" for display
  key_hash    TEXT NOT NULL UNIQUE,       -- sha256(full key), hex
  scopes      JSONB NOT NULL DEFAULT '["read","write"]',
  last_used_at TIMESTAMPTZ,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_org  ON api_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash) WHERE revoked_at IS NULL;

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members can manage api keys" ON api_keys;
CREATE POLICY "Org members can manage api keys" ON api_keys FOR ALL
  USING (org_id = public.current_org_id());

-- ── Click-to-WhatsApp ad attribution ────────────────────────
-- One row per inbound message that carried an ad `referral`. We keep
-- every touch (not just first) so multi-touch attribution is possible.
CREATE TABLE IF NOT EXISTS ctwa_referrals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  source_type     TEXT,        -- 'ad' | 'post'
  source_id       TEXT,        -- the ad / post id
  source_url      TEXT,        -- the ad's destination / fb.me link
  headline        TEXT,
  body            TEXT,
  ctwa_clid       TEXT,        -- click id, for matching back to Ads Manager
  received_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ctwa_referrals_org     ON ctwa_referrals(org_id);
CREATE INDEX IF NOT EXISTS idx_ctwa_referrals_contact ON ctwa_referrals(contact_id);
CREATE INDEX IF NOT EXISTS idx_ctwa_referrals_source  ON ctwa_referrals(org_id, source_id);

ALTER TABLE ctwa_referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members can view ad referrals" ON ctwa_referrals;
CREATE POLICY "Org members can view ad referrals" ON ctwa_referrals FOR ALL
  USING (org_id = public.current_org_id());

-- First-touch acquisition source on the contact (e.g. 'click_to_whatsapp').
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS source TEXT;
