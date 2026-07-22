SELECT u.email, o.name as org_name, om.role, au.user_id IS NOT NULL as is_admin
FROM auth.users u
LEFT JOIN org_members om ON om.user_id = u.id AND om.accepted_at IS NOT NULL
LEFT JOIN organizations o ON o.id = om.org_id
LEFT JOIN admin_users au ON au.user_id = u.id;
