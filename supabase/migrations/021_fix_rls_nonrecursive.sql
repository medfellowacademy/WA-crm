-- ============================================================
-- Fix org_members RLS without any recursion
-- Strategy: users can only see their OWN membership row via RLS.
-- "See all org members" goes through an API route using adminClient().
-- This avoids the infinite-recursion trap entirely.
-- ============================================================

-- Drop all existing org_members SELECT policies
DROP POLICY IF EXISTS "Org members can view members" ON org_members;
DROP POLICY IF EXISTS "Org members can view members" ON org_members;

-- Non-recursive: each user can only see their own membership row(s)
CREATE POLICY "Users can view own memberships" ON org_members FOR SELECT
  USING (user_id = auth.uid());

-- Also allow users to insert their own membership (for invite acceptance)
DROP POLICY IF EXISTS "Users can accept own invite" ON org_members;
CREATE POLICY "Users can accept own invite" ON org_members FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid());

-- Admin/owner can manage members via service role (adminClient in API routes)
-- No change to the ALL policy for owners/admins — but that was also recursive.
-- Drop it: admin operations will use the service role key (bypasses RLS).
DROP POLICY IF EXISTS "Org admin can manage members" ON org_members;

-- Service role can do everything (needed for invite/onboarding flows)
-- (service role bypasses RLS automatically — no policy needed)

-- ============================================================
-- Fix organizations SELECT policy (non-recursive)
-- A user can view an org if they have a membership row for it.
-- Since we now allow users to see their own org_members rows,
-- the subquery below is NOT recursive (it selects from the user's
-- own membership rows which are already visible via the SELECT policy).
-- ============================================================
DROP POLICY IF EXISTS "Org members can view org" ON organizations;
CREATE POLICY "Org members can view org" ON organizations FOR SELECT
  USING (
    id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

-- Grant execute on helper function to authenticated users
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_org_id(UUID) TO authenticated;
