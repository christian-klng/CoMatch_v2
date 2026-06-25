-- Profile contact preferences: how the user prefers to be reached and a free-text
-- note used when others want to get in touch. The channel is 'email' by default;
-- 'linkedin' only makes sense once a linkedin_url is stored (enforced on write in
-- PUT /api/me/profile). contact_note is plain free text (like bio, max 500 chars
-- in the API).

alter table users
  add column if not exists contact_channel text not null default 'email'
    check (contact_channel in ('email', 'linkedin'));

alter table users
  add column if not exists contact_note text;
