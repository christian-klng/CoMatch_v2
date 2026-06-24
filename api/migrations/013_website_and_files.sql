-- Profile website URL (shown next to the LinkedIn link) and user-uploaded
-- files (CV, pitch deck, business model, …). The file bytes live on a
-- persistent server volume under UPLOAD_DIR/<storage_path>; only the metadata
-- is kept in the DB. Reading/parsing the website and files comes later.

alter table users add column if not exists website_url text;

create table if not exists user_files (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  filename     text not null,
  mime         text not null,
  size_bytes   integer not null,
  storage_path text not null,            -- relative path inside UPLOAD_DIR
  created_at   timestamptz not null default now()
);

create index if not exists user_files_user_id_idx on user_files(user_id);
