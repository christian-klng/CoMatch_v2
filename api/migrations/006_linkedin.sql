-- LinkedIn onboarding: store the user's LinkedIn URL, the raw profile (for a
-- later LLM pass), the data-processing consent timestamp, and a self-hosted
-- copy of the profile picture (LinkedIn's image URLs are temporary).

alter table users add column if not exists linkedin_url        text;
alter table users add column if not exists linkedin_profile    jsonb;
alter table users add column if not exists linkedin_consent_at timestamptz;
alter table users add column if not exists avatar_data         bytea;
alter table users add column if not exists avatar_mime         text;
