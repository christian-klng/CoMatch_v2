-- Translated skill concepts (i18n option B): `label` stays the canonical
-- German label (matching & ids are derived from it), `label_en` is the
-- English variant. NULL = not translated yet (clients fall back to `label`).
-- The partial unique index lets canonicalisation resolve an English input
-- to exactly one concept, mirroring the lower(label) index from 008.
alter table skills add column label_en text;
create unique index skills_label_en_lower_key
  on skills (lower(label_en)) where label_en is not null;
