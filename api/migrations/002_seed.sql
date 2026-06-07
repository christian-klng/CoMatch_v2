-- Seed data for local/staging testing. Idempotent via ON CONFLICT.
-- Mirrors src/lib/mockData.ts so the deployed app shows familiar content.

-- Skill catalog ------------------------------------------------------------
insert into skills (id, label) values
  ('frontend',   'Frontend-Entwicklung'),
  ('backend',    'Backend-Entwicklung'),
  ('uxui',       'UX/UI Design'),
  ('product',    'Product Management'),
  ('growth',     'Growth & Marketing'),
  ('sales',      'Sales & BizDev'),
  ('fundraising','Fundraising'),
  ('legal',      'Legal & Recht'),
  ('finance',    'Finance & Controlling'),
  ('ml',         'Machine Learning / AI'),
  ('data',       'Data & Analytics'),
  ('ops',        'Operations'),
  ('hr',         'People & Hiring'),
  ('content',    'Content & Brand'),
  ('cofounder',  'Co-Founder'),
  ('mentoring',  'Mentoring')
on conflict (id) do update set label = excluded.label;

-- Demo community -----------------------------------------------------------
insert into communities (id, name, join_code, context) values
  ('00000000-0000-0000-0000-0000000000c1',
   'TechFest Berlin 2025',
   'comatch://join/c_techfest25?sig=demo',
   'Konferenz · 12.–13. Juni')
on conflict (join_code) do nothing;

-- Demo users ---------------------------------------------------------------
insert into users (id, name, role, company, avatar_url, bio, attributes) values
  ('00000000-0000-0000-0000-0000000000a1','Anna Schmidt','Senior Product Managerin','Northwind SaaS','https://i.pravatar.cc/240?img=47','Baue B2B-Produkte von 0→1. Suche technische Mitgründer-Energie.','{"B2B SaaS","8 Jahre Erfahrung","Ex-Gründerin"}'),
  ('00000000-0000-0000-0000-0000000000a2','Jonas Weber','ML Engineer','Helix Labs','https://i.pravatar.cc/240?img=12','LLM-Infra & RAG-Systeme. Offen für spannende Side-Projects.','{"LLMs","PyTorch","Open Source"}'),
  ('00000000-0000-0000-0000-0000000000a3','Leïla Hadad','Brand & Content Lead','Freelance','https://i.pravatar.cc/240?img=32','Story-first Marketing für Deep-Tech. Suche Gründerteams mit Substanz.','{"Storytelling","Deep-Tech","Freelance"}'),
  ('00000000-0000-0000-0000-0000000000a4','David Okoro','Full-Stack Developer','Stealth Startup','https://i.pravatar.cc/240?img=68','TypeScript end-to-end. Suche ein starkes Produkt-/Design-Gegenüber.','{"TypeScript","React","Postgres"}'),
  ('00000000-0000-0000-0000-0000000000a5','Sofia Rossi','Venture Partner','Atlas Ventures','https://i.pravatar.cc/240?img=23','Pre-Seed & Seed in B2B / AI. Treffe gern technische Gründer:innen.','{"Pre-Seed","B2B / AI","Angel"}')
on conflict (id) do nothing;

-- Memberships --------------------------------------------------------------
insert into community_members (community_id, user_id)
select '00000000-0000-0000-0000-0000000000c1', id from users
on conflict do nothing;

-- Seeks / offers -----------------------------------------------------------
insert into user_skills (user_id, skill_id, kind) values
  ('00000000-0000-0000-0000-0000000000a1','frontend','seek'),
  ('00000000-0000-0000-0000-0000000000a1','ml','seek'),
  ('00000000-0000-0000-0000-0000000000a1','product','offer'),
  ('00000000-0000-0000-0000-0000000000a1','fundraising','offer'),
  ('00000000-0000-0000-0000-0000000000a2','product','seek'),
  ('00000000-0000-0000-0000-0000000000a2','growth','seek'),
  ('00000000-0000-0000-0000-0000000000a2','ml','offer'),
  ('00000000-0000-0000-0000-0000000000a2','backend','offer'),
  ('00000000-0000-0000-0000-0000000000a3','cofounder','seek'),
  ('00000000-0000-0000-0000-0000000000a3','fundraising','seek'),
  ('00000000-0000-0000-0000-0000000000a3','content','offer'),
  ('00000000-0000-0000-0000-0000000000a3','growth','offer'),
  ('00000000-0000-0000-0000-0000000000a4','uxui','seek'),
  ('00000000-0000-0000-0000-0000000000a4','product','seek'),
  ('00000000-0000-0000-0000-0000000000a4','frontend','offer'),
  ('00000000-0000-0000-0000-0000000000a4','backend','offer'),
  ('00000000-0000-0000-0000-0000000000a5','cofounder','seek'),
  ('00000000-0000-0000-0000-0000000000a5','ml','seek'),
  ('00000000-0000-0000-0000-0000000000a5','fundraising','offer'),
  ('00000000-0000-0000-0000-0000000000a5','finance','offer')
on conflict do nothing;
