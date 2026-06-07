-- CoMatch initial schema (v0.1)
-- Mirrors src/lib/types.ts so the move from mock data -> real API stays mechanical.

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- Controlled skill vocabulary ("ich suche / ich kann" picker).
-- id is a stable slug (e.g. 'frontend'), matching SKILL_CATALOG ids.
create table if not exists skills (
  id    text primary key,
  label text not null
);

create table if not exists communities (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  join_code  text not null unique,   -- prod: signed + expiring, not a raw id
  context    text,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id         uuid primary key default gen_random_uuid(),
  email      text unique,            -- used by auth later (currently nullable)
  name       text not null,
  role       text not null,
  company    text,
  avatar_url text,
  bio        text,
  attributes text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Which user belongs to which community (set on QR scan / join).
create table if not exists community_members (
  community_id uuid references communities(id) on delete cascade,
  user_id      uuid references users(id) on delete cascade,
  joined_at    timestamptz not null default now(),
  primary key (community_id, user_id)
);

-- A user seeks or offers a skill from the controlled vocabulary.
do $$ begin
  create type skill_kind as enum ('seek', 'offer');
exception when duplicate_object then null; end $$;

create table if not exists user_skills (
  user_id  uuid references users(id) on delete cascade,
  skill_id text references skills(id),
  kind     skill_kind not null,
  primary key (user_id, skill_id, kind)
);

-- Hybrid matching: directional connection request lifecycle.
do $$ begin
  create type connection_status as enum ('requested', 'connected');
exception when duplicate_object then null; end $$;

create table if not exists connections (
  requester_id uuid references users(id) on delete cascade,
  addressee_id uuid references users(id) on delete cascade,
  status       connection_status not null default 'requested',
  created_at   timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create index if not exists idx_members_user on community_members(user_id);
create index if not exists idx_user_skills_skill on user_skills(skill_id);
