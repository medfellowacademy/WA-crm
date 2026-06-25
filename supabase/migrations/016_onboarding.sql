-- ============================================================
-- Onboarding tracking
-- Adds onboarded_at to organizations so the app can redirect
-- new users through the setup wizard exactly once.
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_organizations_onboarded
  ON organizations(id) WHERE onboarded_at IS NULL;
