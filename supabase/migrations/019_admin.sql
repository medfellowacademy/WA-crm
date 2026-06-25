-- ── Super Admin ──────────────────────────────────────────────────────
-- Adds an is_super_admin flag to auth.users via a profiles extension.

CREATE TABLE IF NOT EXISTS admin_users (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only super admins can read this table (via service role in API routes)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access" ON admin_users FOR ALL USING (false);

-- View for admin dashboard: orgs + usage + member count
CREATE OR REPLACE VIEW admin_org_overview AS
SELECT
  o.id,
  o.name,
  o.slug,
  o.plan,
  o.subscription_status,
  o.stripe_customer_id,
  o.stripe_subscription_id,
  o.created_at,
  o.onboarded_at,
  (SELECT COUNT(*) FROM org_members m WHERE m.org_id = o.id AND m.accepted_at IS NOT NULL) AS member_count,
  (SELECT COUNT(*) FROM contacts c WHERE c.org_id = o.id) AS contact_count,
  (SELECT COUNT(*) FROM messages msg
     JOIN conversations cv ON cv.id = msg.conversation_id
     WHERE cv.org_id = o.id AND msg.sender_type IN ('agent', 'bot')
       AND msg.created_at > now() - interval '30 days') AS messages_30d,
  (SELECT COUNT(*) FROM broadcasts b WHERE b.org_id = o.id) AS broadcast_count,
  (SELECT MAX(msg2.created_at) FROM messages msg2
     JOIN conversations cv2 ON cv2.id = msg2.conversation_id
     WHERE cv2.org_id = o.id) AS last_activity
FROM organizations o;
