-- Admin auth: email + password login for the Admin SPA.
-- Separate from the passwordless `users`/`auth_tokens` flow — admins are a small
-- operator group, created via the `admin:create` CLI script. We store only a
-- scrypt hash of the password (format: scrypt$<saltHex>$<hashHex>), never the
-- raw value.
create table if not exists admin_users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,   -- lowercase, login identifier
  password_hash text not null,          -- scrypt$salt$hash
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);
