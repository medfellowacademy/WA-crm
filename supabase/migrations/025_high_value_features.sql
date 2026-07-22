-- ============================================================
-- High Value Features: Contact Segments, Appointments, SLA
-- ============================================================

-- 1. Contact Segments (saved audience filters)
CREATE TABLE IF NOT EXISTS contact_segments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  filters     JSONB NOT NULL DEFAULT '{}',
  contact_count INT NOT NULL DEFAULT 0,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_segments_org ON contact_segments(org_id);
ALTER TABLE contact_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage segments" ON contact_segments FOR ALL
  USING (org_id = public.current_org_id());

-- 2. Appointment types (what the org offers for booking)
CREATE TABLE IF NOT EXISTS appointment_types (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  duration_min INT NOT NULL DEFAULT 30,
  buffer_min   INT NOT NULL DEFAULT 5,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  color        TEXT DEFAULT '#6366f1',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage appointment types" ON appointment_types FOR ALL
  USING (org_id = public.current_org_id());

-- 3. Appointments (bookings made by contacts)
CREATE TABLE IF NOT EXISTS appointments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  appointment_type_id UUID REFERENCES appointment_types(id) ON DELETE SET NULL,
  contact_id          UUID REFERENCES contacts(id) ON DELETE SET NULL,
  conversation_id     UUID REFERENCES conversations(id) ON DELETE SET NULL,
  assigned_to         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title               TEXT NOT NULL,
  notes               TEXT,
  starts_at           TIMESTAMPTZ NOT NULL,
  ends_at             TIMESTAMPTZ NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed')),
  booker_name         TEXT,
  booker_email        TEXT,
  booker_phone        TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_appointments_org ON appointments(org_id);
CREATE INDEX IF NOT EXISTS idx_appointments_starts ON appointments(starts_at);
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage appointments" ON appointments FOR ALL
  USING (org_id = public.current_org_id());

-- 4. SLA settings per org (stored on organizations as a JSON field)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sla_settings JSONB DEFAULT '{"first_response_minutes":60,"resolution_hours":24}';

-- 5. AI usage tracking
CREATE TABLE IF NOT EXISTS ai_usage (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feature         TEXT NOT NULL,
  tokens_in       INT NOT NULL DEFAULT 0,
  tokens_out      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view AI usage" ON ai_usage FOR SELECT
  USING (org_id = public.current_org_id());
