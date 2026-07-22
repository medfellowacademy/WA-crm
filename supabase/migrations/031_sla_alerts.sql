-- ============================================================
-- Migration 031 — SLA alerts
--
-- Tracks SLA breaches per conversation. When a cron detects a
-- breach (open > first_response_minutes, pending > resolution_hours)
-- it inserts a row here. The inbox shows a badge; admins get notified.
-- ============================================================

CREATE TABLE IF NOT EXISTS sla_alerts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  alert_type       TEXT NOT NULL CHECK (alert_type IN ('first_response', 'resolution')),
  breached_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at      TIMESTAMPTZ,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  escalated_to     UUID REFERENCES profiles(id),  -- agent it was re-assigned to
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, alert_type)  -- one active alert per type per conv
);

ALTER TABLE sla_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read sla_alerts"
  ON sla_alerts FOR SELECT
  USING (org_id = current_org_id());

CREATE INDEX IF NOT EXISTS idx_sla_alerts_org_active ON sla_alerts(org_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sla_alerts_conv ON sla_alerts(conversation_id);

-- Allow realtime subscription so the inbox can show live breach badges
ALTER PUBLICATION supabase_realtime ADD TABLE sla_alerts;
