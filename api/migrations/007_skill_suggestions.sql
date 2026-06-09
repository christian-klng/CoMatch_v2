-- AI-generated skill suggestions (from the LinkedIn profile via Mistral),
-- stored so the skills screen can highlight them. Shape: {seeks:[], offers:[]}
-- of catalog skill ids.
alter table users add column if not exists skill_suggestions jsonb;
