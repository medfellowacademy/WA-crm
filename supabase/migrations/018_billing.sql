-- ── Billing & Usage ──────────────────────────────────────────────────
-- Adds Stripe subscription tracking + monthly usage counters to orgs.

-- Extend organizations with billing columns
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id   TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status  TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_status IN ('free','trialing','active','past_due','canceled','unpaid')),
  ADD COLUMN IF NOT EXISTS plan                 TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free','starter','pro','business')),
  ADD COLUMN IF NOT EXISTS plan_period_start    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_period_end      TIMESTAMPTZ;

-- Usage counters (reset monthly via cron)
CREATE TABLE IF NOT EXISTS org_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start    DATE NOT NULL,                  -- first day of billing month
  messages_sent   INT  NOT NULL DEFAULT 0,
  contacts_count  INT  NOT NULL DEFAULT 0,        -- snapshot, not delta
  broadcasts_sent INT  NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, period_start)
);

ALTER TABLE org_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read own usage"
  ON org_usage FOR SELECT
  USING (org_id = public.current_org_id());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_usage_org_period ON org_usage (org_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_orgs_stripe_customer  ON organizations (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_orgs_stripe_sub       ON organizations (stripe_subscription_id);

-- Helper: upsert usage for current period
CREATE OR REPLACE FUNCTION increment_org_usage(
  p_org_id   UUID,
  p_messages INT DEFAULT 0,
  p_broadcasts INT DEFAULT 0
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_period DATE := date_trunc('month', now())::DATE;
BEGIN
  INSERT INTO org_usage (org_id, period_start, messages_sent, broadcasts_sent)
    VALUES (p_org_id, v_period, p_messages, p_broadcasts)
  ON CONFLICT (org_id, period_start) DO UPDATE
    SET messages_sent   = org_usage.messages_sent   + EXCLUDED.messages_sent,
        broadcasts_sent = org_usage.broadcasts_sent + EXCLUDED.broadcasts_sent,
        updated_at      = now();
END;
$$;
