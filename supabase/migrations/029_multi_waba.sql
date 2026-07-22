-- ============================================================
-- Migration 029 — Multi-WABA: whatsapp_number_id backfill
--
-- conversations.whatsapp_number_id was added in migration 023 but
-- never populated for existing rows.  This migration:
--
--  1. Backfills whatsapp_number_id on existing conversations by
--     matching whatsapp_config.phone_number_id → whatsapp_numbers.
--  2. Adds org_id to flow_runs (so the flows engine persists org
--     context when starting a run — needed for credential resolution).
--  3. Adds an index on flow_runs.org_id.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

-- ── 1. Backfill conversations.whatsapp_number_id ──────────────
--
-- For each user that has both a whatsapp_config row (old single-number
-- table) and one or more whatsapp_numbers rows for the same org, we
-- pick the number whose phone_number_id matches the config and stamp
-- every conversation that user owns.
--
-- If the org has already migrated fully to whatsapp_numbers (no legacy
-- whatsapp_config), we fall back to the org's default number.
DO $$
DECLARE
  cfg RECORD;
  num_id UUID;
BEGIN
  FOR cfg IN
    SELECT wc.user_id, wc.phone_number_id, wc.org_id
    FROM whatsapp_config wc
    WHERE wc.phone_number_id IS NOT NULL
  LOOP
    -- Try exact phone_number_id match in whatsapp_numbers for this org
    SELECT id INTO num_id
    FROM whatsapp_numbers
    WHERE phone_number_id = cfg.phone_number_id
      AND (cfg.org_id IS NULL OR org_id = cfg.org_id)
    LIMIT 1;

    -- Fallback: org default number when no exact match
    IF num_id IS NULL AND cfg.org_id IS NOT NULL THEN
      SELECT id INTO num_id
      FROM whatsapp_numbers
      WHERE org_id = cfg.org_id
        AND is_default = true
        AND is_active  = true
      LIMIT 1;
    END IF;

    IF num_id IS NOT NULL THEN
      UPDATE conversations
      SET    whatsapp_number_id = num_id
      WHERE  user_id             = cfg.user_id
        AND  whatsapp_number_id IS NULL;
    END IF;
  END LOOP;
END $$;

-- ── 2. Add org_id to flow_runs ────────────────────────────────
ALTER TABLE flow_runs ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);

-- ── 3. Index on flow_runs.org_id ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_flow_runs_org ON flow_runs(org_id);

-- ── 4. Backfill flow_runs.org_id from their conversations ─────
UPDATE flow_runs fr
SET    org_id = c.org_id
FROM   conversations c
WHERE  fr.conversation_id = c.id
  AND  c.org_id IS NOT NULL
  AND  fr.org_id IS NULL;
