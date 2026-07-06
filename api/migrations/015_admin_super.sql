-- Super-admin flag for admin_users. Only super-admins may manage other admin
-- accounts (create / reset password / grant-super / delete) via the Admin SPA's
-- new "Admins" tab. Regular admins keep full access to communities and users but
-- can't touch the admin roster. The super check is enforced server-side
-- (requireSuperAdmin) and mirrored in the SPA (tab hidden for non-supers).
alter table admin_users
  add column if not exists is_super_admin boolean not null default false;

-- Bootstrap: promote the earliest-created admin (the founding operator) so the
-- feature is reachable right after deploy without a manual CLI step. Idempotent
-- and no-op once any super-admin exists.
update admin_users
   set is_super_admin = true
 where id = (select id from admin_users order by created_at asc limit 1)
   and not exists (select 1 from admin_users where is_super_admin);
