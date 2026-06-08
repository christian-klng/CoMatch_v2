-- Auth: passwordless magic-link login.

-- Magic-link users start with only an email; name/role come later in onboarding.
alter table users alter column name drop not null;
alter table users alter column role drop not null;

-- One-time login tokens. We store only a SHA-256 hash of the token, never the
-- raw value, so a DB leak can't be used to log in.
create table if not exists auth_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  token_hash  text not null,
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists idx_auth_tokens_hash on auth_tokens(token_hash);
