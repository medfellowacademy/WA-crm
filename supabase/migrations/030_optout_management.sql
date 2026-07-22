-- ============================================================
-- Migration 030 — Opt-out / STOP keyword management
--
-- Tracks per-contact opt-out state per org. When a contact texts
-- STOP / UNSUBSCRIBE / QUIT / END / CANCEL, they are added here.
-- Outbound messages and broadcasts skip opted-out contacts.
-- Contacts can opt back in by texting START / YES.
-- ============================================================

CREATE TABLE IF NOT EXISTS contact_optouts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id    UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  opted_out_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  opted_in_at   TIMESTAMPTZ,          -- set when contact re-subscribes
  keyword       TEXT,                  -- the exact word they sent (e.g. "STOP")
  is_active     BOOLEAN NOT NULL DEFAULT true,  -- false = re-opted-in
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, contact_id)          -- one row per contact per org
);

-- RLS: agents can only see their org's opt-outs
ALTER TABLE contact_optouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read optouts"
  ON contact_optouts FOR SELECT
  USING (org_id = current_org_id());

CREATE POLICY "org members can insert optouts"
  ON contact_optouts FOR INSERT
  WITH CHECK (org_id = current_org_id());

CREATE POLICY "org members can update optouts"
  ON contact_optouts FOR UPDATE
  USING (org_id = current_org_id());

CREATE POLICY "org members can delete optouts"
  ON contact_optouts FOR DELETE
  USING (org_id = current_org_id());

-- Index for fast contact lookups
CREATE INDEX IF NOT EXISTS idx_contact_optouts_contact ON contact_optouts(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_optouts_org ON contact_optouts(org_id);
CREATE INDEX IF NOT EXISTS idx_contact_optouts_active ON contact_optouts(org_id, is_active) WHERE is_active = true;

-- Add is_opted_out computed column to contacts view (denormalized for fast checks)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_opted_out BOOLEAN NOT NULL DEFAULT false;

-- Function to sync contacts.is_opted_out from contact_optouts
CREATE OR REPLACE FUNCTION sync_contact_optout_flag()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE contacts SET is_opted_out = false WHERE id = OLD.contact_id;
    RETURN OLD;
  END IF;
  UPDATE contacts SET is_opted_out = NEW.is_active WHERE id = NEW.contact_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_contact_optout ON contact_optouts;
CREATE TRIGGER trg_sync_contact_optout
  AFTER INSERT OR UPDATE OR DELETE ON contact_optouts
  FOR EACH ROW EXECUTE FUNCTION sync_contact_optout_flag();
