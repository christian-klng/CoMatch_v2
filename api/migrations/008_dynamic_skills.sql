-- Open up the skill vocabulary: skills are no longer a fixed catalog. New
-- skills (LLM-generated from LinkedIn profiles, or seeded from the user pool)
-- are inserted on the fly. Matching compares labels (see matches.ts), so the
-- one invariant we need is: exactly one canonical row per label.
create unique index if not exists skills_label_lower_idx on skills (lower(label));

-- Track where a skill came from so we can moderate/clean later. Existing rows
-- are the original test catalog → 'seed'; dynamically created ones → 'llm'.
alter table skills add column if not exists source     text        not null default 'seed';
alter table skills add column if not exists created_at timestamptz not null default now();
