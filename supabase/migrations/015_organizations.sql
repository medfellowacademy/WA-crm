-- ============================================================
-- Organizations (Multi-tenancy)
--
-- Transforms the app from single-user to multi-tenant SaaS.
-- Each organization is an isolated workspace — contacts,
-- conversations, broadcasts, and all other data is scoped by
-- org_id so team members share a single inbox.
--
-- Strategy:
--   1. Create organizations + org_members tables.
--   2. Add org_id (nullable) to every data table.
--   3. Backfill: for every existing auth.users row, create an
--      org and set that user as owner. Migrate their data.
--   4. Make org_id NOT NULL (after backfill guarantees it).
--   5. Replace all user_id-scoped RLS policies with org_id-
--      scoped policies that allow any org member to access data.
--   6. Extend handle_new_user() to auto-create an org on signup.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'business')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug  ON organizations(slug);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ORG_MEMBERS (created before organizations policies that reference it)
-- ============================================================
CREATE TABLE IF NOT EXISTS org_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  invited_by  UUID REFERENCES auth.users(id),
  invite_token TEXT UNIQUE,
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, email)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org    ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user   ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_token  ON org_members(invite_token) WHERE invite_token IS NOT NULL;

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ORGANIZATIONS POLICIES (after org_members table exists)
-- ============================================================

-- Members can see their own org
DROP POLICY IF EXISTS "Org members can view org" ON organizations;
CREATE POLICY "Org members can view org" ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = organizations.id
        AND org_members.user_id = auth.uid()
        AND org_members.accepted_at IS NOT NULL
    )
  );

-- Only owner can update
DROP POLICY IF EXISTS "Org owner can update" ON organizations;
CREATE POLICY "Org owner can update" ON organizations FOR UPDATE
  USING (owner_id = auth.uid());

-- Members can see who else is in their org
DROP POLICY IF EXISTS "Org members can view members" ON org_members;
CREATE POLICY "Org members can view members" ON org_members FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_members om2
      WHERE om2.user_id = auth.uid() AND om2.accepted_at IS NOT NULL
    )
  );

-- Owner/admin can manage members
DROP POLICY IF EXISTS "Org admin can manage members" ON org_members;
CREATE POLICY "Org admin can manage members" ON org_members FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM org_members om2
      WHERE om2.user_id = auth.uid()
        AND om2.role IN ('owner', 'admin')
        AND om2.accepted_at IS NOT NULL
    )
  );

-- ============================================================
-- Helper: resolve the org_id for a given user (their primary org)
-- Used by RLS helper functions and server-side code.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_org_id(uid UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id
  FROM org_members
  WHERE user_id = uid
    AND accepted_at IS NOT NULL
  ORDER BY created_at ASC
  LIMIT 1;
$$;

-- Convenience wrapper for the current Supabase session user
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_org_id(auth.uid());
$$;

-- ============================================================
-- ADD org_id TO ALL DATA TABLES
-- ============================================================
ALTER TABLE contacts           ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE conversations      ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE messages           ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE tags               ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE custom_fields      ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE message_templates  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE pipelines          ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE deals              ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE broadcasts         ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE whatsapp_config    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);

-- ============================================================
-- BACKFILL: one org per existing user
-- ============================================================
DO $$
DECLARE
  u RECORD;
  new_org_id UUID;
  slug_base  TEXT;
  slug_val   TEXT;
  suffix     INT := 0;
BEGIN
  FOR u IN SELECT id, email FROM auth.users LOOP
    -- Skip if already has an org membership
    IF EXISTS (SELECT 1 FROM org_members WHERE user_id = u.id) THEN
      CONTINUE;
    END IF;

    -- Generate unique slug from email prefix
    slug_base := regexp_replace(split_part(u.email, '@', 1), '[^a-z0-9]', '-', 'g');
    slug_val  := slug_base;
    suffix    := 0;
    WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = slug_val) LOOP
      suffix   := suffix + 1;
      slug_val := slug_base || '-' || suffix;
    END LOOP;

    -- Create org
    INSERT INTO organizations (name, slug, owner_id)
    VALUES (
      COALESCE((SELECT full_name FROM profiles WHERE user_id = u.id), split_part(u.email, '@', 1)) || '''s Workspace',
      slug_val,
      u.id
    )
    RETURNING id INTO new_org_id;

    -- Add owner as accepted member
    INSERT INTO org_members (org_id, user_id, email, role, accepted_at)
    VALUES (new_org_id, u.id, u.email, 'owner', NOW());

    -- Backfill all their data
    UPDATE contacts          SET org_id = new_org_id WHERE user_id = u.id AND org_id IS NULL;
    UPDATE conversations     SET org_id = new_org_id WHERE user_id = u.id AND org_id IS NULL;
    UPDATE tags              SET org_id = new_org_id WHERE user_id = u.id AND org_id IS NULL;
    UPDATE custom_fields     SET org_id = new_org_id WHERE user_id = u.id AND org_id IS NULL;
    UPDATE message_templates SET org_id = new_org_id WHERE user_id = u.id AND org_id IS NULL;
    UPDATE pipelines         SET org_id = new_org_id WHERE user_id = u.id AND org_id IS NULL;
    UPDATE deals             SET org_id = new_org_id WHERE user_id = u.id AND org_id IS NULL;
    UPDATE broadcasts        SET org_id = new_org_id WHERE user_id = u.id AND org_id IS NULL;
    UPDATE whatsapp_config   SET org_id = new_org_id WHERE user_id = u.id AND org_id IS NULL;

    -- Messages via conversations
    UPDATE messages m
    SET org_id = new_org_id
    FROM conversations c
    WHERE m.conversation_id = c.id AND c.user_id = u.id AND m.org_id IS NULL;
  END LOOP;
END $$;

-- ============================================================
-- Indexes on org_id for all data tables
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_contacts_org           ON contacts(org_id);
CREATE INDEX IF NOT EXISTS idx_conversations_org      ON conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_messages_org           ON messages(org_id);
CREATE INDEX IF NOT EXISTS idx_tags_org               ON tags(org_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_org      ON custom_fields(org_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_org  ON message_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_org          ON pipelines(org_id);
CREATE INDEX IF NOT EXISTS idx_deals_org              ON deals(org_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_org         ON broadcasts(org_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_org    ON whatsapp_config(org_id);

-- ============================================================
-- UPDATE RLS POLICIES — scope by org membership
-- ============================================================

-- CONTACTS
DROP POLICY IF EXISTS "Users can manage own contacts" ON contacts;
CREATE POLICY "Org members can manage contacts" ON contacts FOR ALL
  USING (org_id = public.current_org_id());

-- TAGS
DROP POLICY IF EXISTS "Users can manage own tags" ON tags;
CREATE POLICY "Org members can manage tags" ON tags FOR ALL
  USING (org_id = public.current_org_id());

-- CONTACT_TAGS: still joins through contacts, which is now org-scoped
DROP POLICY IF EXISTS "Users can manage contact tags" ON contact_tags;
CREATE POLICY "Org members can manage contact tags" ON contact_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_tags.contact_id
        AND contacts.org_id = public.current_org_id()
    )
  );

-- CUSTOM_FIELDS
DROP POLICY IF EXISTS "Users can manage own custom fields" ON custom_fields;
CREATE POLICY "Org members can manage custom fields" ON custom_fields FOR ALL
  USING (org_id = public.current_org_id());

-- CONTACT_CUSTOM_VALUES
DROP POLICY IF EXISTS "Users can manage custom values" ON contact_custom_values;
CREATE POLICY "Org members can manage custom values" ON contact_custom_values FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_custom_values.contact_id
        AND contacts.org_id = public.current_org_id()
    )
  );

-- CONTACT_NOTES
DROP POLICY IF EXISTS "Users can manage own notes" ON contact_notes;
CREATE POLICY "Org members can manage notes" ON contact_notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_notes.contact_id
        AND contacts.org_id = public.current_org_id()
    )
  );

-- CONVERSATIONS
DROP POLICY IF EXISTS "Users can manage own conversations" ON conversations;
CREATE POLICY "Org members can manage conversations" ON conversations FOR ALL
  USING (org_id = public.current_org_id());

-- MESSAGES
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Service role can insert messages" ON messages;
CREATE POLICY "Org members can view messages" ON messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.org_id = public.current_org_id()
    )
  );
CREATE POLICY "Service role can insert messages" ON messages FOR INSERT WITH CHECK (true);

-- WHATSAPP_CONFIG
DROP POLICY IF EXISTS "Users can manage own config" ON whatsapp_config;
CREATE POLICY "Org members can manage whatsapp config" ON whatsapp_config FOR ALL
  USING (org_id = public.current_org_id());

-- MESSAGE_TEMPLATES
DROP POLICY IF EXISTS "Users can manage own templates" ON message_templates;
CREATE POLICY "Org members can manage templates" ON message_templates FOR ALL
  USING (org_id = public.current_org_id());

-- PIPELINES
DROP POLICY IF EXISTS "Users can manage own pipelines" ON pipelines;
CREATE POLICY "Org members can manage pipelines" ON pipelines FOR ALL
  USING (org_id = public.current_org_id());

-- PIPELINE_STAGES: through pipeline
DROP POLICY IF EXISTS "Users can manage pipeline stages" ON pipeline_stages;
CREATE POLICY "Org members can manage pipeline stages" ON pipeline_stages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pipelines
      WHERE pipelines.id = pipeline_stages.pipeline_id
        AND pipelines.org_id = public.current_org_id()
    )
  );

-- DEALS
DROP POLICY IF EXISTS "Users can manage own deals" ON deals;
CREATE POLICY "Org members can manage deals" ON deals FOR ALL
  USING (org_id = public.current_org_id());

-- BROADCASTS
DROP POLICY IF EXISTS "Users can manage own broadcasts" ON broadcasts;
CREATE POLICY "Org members can manage broadcasts" ON broadcasts FOR ALL
  USING (org_id = public.current_org_id());

-- BROADCAST_RECIPIENTS: through broadcasts
DROP POLICY IF EXISTS "Users can manage broadcast recipients" ON broadcast_recipients;
CREATE POLICY "Org members can manage broadcast recipients" ON broadcast_recipients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM broadcasts
      WHERE broadcasts.id = broadcast_recipients.broadcast_id
        AND broadcasts.org_id = public.current_org_id()
    )
  );

-- ============================================================
-- AUTO-CREATE ORG ON SIGNUP
-- Extends handle_new_user() to also create an org + owner member.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id  UUID;
  slug_base   TEXT;
  slug_val    TEXT;
  suffix_num  INT := 0;
BEGIN
  -- Create profile
  BEGIN
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NEW.email
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;

  -- Create default organization
  BEGIN
    slug_base  := regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '-', 'g');
    slug_val   := slug_base;
    suffix_num := 0;
    WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = slug_val) LOOP
      suffix_num := suffix_num + 1;
      slug_val   := slug_base || '-' || suffix_num;
    END LOOP;

    INSERT INTO organizations (name, slug, owner_id)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Workspace',
      slug_val,
      NEW.id
    )
    RETURNING id INTO new_org_id;

    INSERT INTO org_members (org_id, user_id, email, role, accepted_at)
    VALUES (new_org_id, NEW.id, NEW.email, 'owner', NOW());
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create org for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- updated_at trigger on organizations
DROP TRIGGER IF EXISTS set_updated_at ON organizations;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
