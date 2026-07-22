-- ============================================================
-- Fix recursive RLS on org_members + seed org for existing user
-- ============================================================

-- The "Org members can view members" policy queries org_members to check
-- if the caller is a member — which triggers the policy again → infinite
-- recursion (500 error). Fix: use a SECURITY DEFINER helper function
-- that bypasses RLS for the membership check.

CREATE OR REPLACE FUNCTION public.is_org_member(check_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = check_org_id
      AND user_id = auth.uid()
      AND accepted_at IS NOT NULL
  );
$$;

-- Drop the recursive policies and replace with non-recursive ones
DROP POLICY IF EXISTS "Org members can view members" ON org_members;
CREATE POLICY "Org members can view members" ON org_members FOR SELECT
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "Org admin can manage members" ON org_members;
CREATE POLICY "Org admin can manage members" ON org_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM org_members om2
      WHERE om2.org_id = org_members.org_id
        AND om2.user_id = auth.uid()
        AND om2.role IN ('owner', 'admin')
        AND om2.accepted_at IS NOT NULL
    )
  );

-- Also fix the organizations SELECT policy to use the helper
DROP POLICY IF EXISTS "Org members can view org" ON organizations;
CREATE POLICY "Org members can view org" ON organizations FOR SELECT
  USING (public.is_org_member(id));

-- ============================================================
-- Ensure every existing auth.users row has an org + membership
-- (handles users who signed up before or after the trigger was set)
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
    IF EXISTS (SELECT 1 FROM org_members WHERE user_id = u.id) THEN
      CONTINUE;
    END IF;

    slug_base := regexp_replace(split_part(u.email, '@', 1), '[^a-z0-9]', '-', 'g');
    slug_val  := slug_base;
    suffix    := 0;
    WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = slug_val) LOOP
      suffix   := suffix + 1;
      slug_val := slug_base || '-' || suffix;
    END LOOP;

    INSERT INTO organizations (name, slug, owner_id)
    VALUES (
      COALESCE(
        (SELECT full_name FROM profiles WHERE user_id = u.id AND full_name <> ''),
        split_part(u.email, '@', 1)
      ) || '''s Workspace',
      slug_val,
      u.id
    )
    RETURNING id INTO new_org_id;

    INSERT INTO org_members (org_id, user_id, email, role, accepted_at)
    VALUES (new_org_id, u.id, u.email, 'owner', NOW());
  END LOOP;
END $$;

-- ============================================================
-- Make yourself super admin
-- ============================================================
INSERT INTO admin_users (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM admin_users)
LIMIT 1;
