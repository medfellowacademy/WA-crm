-- ============================================================
-- Critical Features: Internal Notes, Quick Replies, Agent Status
-- ============================================================

-- 1. Internal notes flag on messages (conversations.assigned_agent_id already exists)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false;

-- 2. Agent online status
CREATE TABLE IF NOT EXISTS agent_status (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online','away','offline')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE agent_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view agent status" ON agent_status FOR SELECT
  USING (org_id = public.current_org_id());
CREATE POLICY "Users can manage own status" ON agent_status FOR ALL
  USING (user_id = auth.uid());

-- 3. Quick replies (saved responses)
CREATE TABLE IF NOT EXISTS quick_replies (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shortcut   TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, shortcut)
);
CREATE INDEX IF NOT EXISTS idx_quick_replies_org ON quick_replies(org_id);
ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage quick replies" ON quick_replies FOR ALL
  USING (org_id = public.current_org_id());

-- 4. CSV contact imports tracking
CREATE TABLE IF NOT EXISTS contact_imports (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  imported_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  filename     TEXT,
  total        INT NOT NULL DEFAULT 0,
  imported     INT NOT NULL DEFAULT 0,
  duplicates   INT NOT NULL DEFAULT 0,
  errors       INT NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','failed')),
  error_log    JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE contact_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view imports" ON contact_imports FOR ALL
  USING (org_id = public.current_org_id());
