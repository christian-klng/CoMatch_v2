// Canonicalisation for the (open) bilingual skill vocabulary. A `skills` row
// is one CONCEPT: `label` holds the canonical German variant (ids/matching
// derive from it), `label_en` the English one (NULL until translated).
// Free-text input in either language resolves to exactly one concept:
//   1. direct lookup on both label columns (case-insensitive),
//   2. on miss: LLM-translate the input and look up the translation — an
//      English "Frontend Development" lands on the existing German
//      "Frontend-Entwicklung" concept instead of forking the vocabulary,
//   3. still no hit → insert a new concept with both language variants.
import { pool } from "./db.js";
import {
  mistralConfigured,
  translateSkillLabels,
  type SkillLocale,
} from "./mistral.js";

/** Normalise a label for display/storage: trim + collapse inner whitespace. */
export function normalizeLabel(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Slug id from a label, e.g. "Smart Contracts" → "smart-contracts". Falls back
 *  to a hashy suffix when a label has no slug-able characters. */
export function slugify(label: string): string {
  const slug = normalizeLabel(label)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics (ä→a etc. after NFKD)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || `skill-${Math.abs(hash(label)).toString(36)}`;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

interface ConceptRow {
  id: string;
  label: string;
  label_en: string | null;
}

/** A concept whose German OR English label matches (case-insensitive). */
async function findConcept(label: string): Promise<ConceptRow | null> {
  const { rows } = await pool.query<ConceptRow>(
    `select id, label, label_en from skills
      where lower(label) = lower($1) or lower(label_en) = lower($1)
      limit 1`,
    [label],
  );
  return rows[0] ?? null;
}

/** Backfill a concept's missing English label; ignores unique collisions
 *  (the label may already name another concept — then we keep NULL). */
async function fillLabelEn(id: string, labelEn: string): Promise<void> {
  try {
    await pool.query(
      `update skills set label_en = $2 where id = $1 and label_en is null`,
      [id, labelEn],
    );
  } catch (e: unknown) {
    if ((e as { code?: string })?.code !== "23505") throw e;
  }
}

/** Insert a new concept (German label required, English optional). Retries on
 *  id collisions with a suffixed slug; drops label_en on its unique collision. */
async function insertConcept(labelDe: string, labelEn: string | null): Promise<void> {
  let id = slugify(labelDe);
  let en = labelEn;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await pool.query(
        `insert into skills (id, label, label_en, source) values ($1, $2, $3, 'llm')
         on conflict (lower(label)) do nothing`,
        [id, labelDe, en],
      );
      return;
    } catch (e: unknown) {
      const err = e as { code?: string; constraint?: string };
      if (err.code !== "23505") throw e;
      if (err.constraint === "skills_label_en_lower_key") {
        // English variant already names another concept — store without it.
        en = null;
        continue;
      }
      // id (primary key) already taken by a *different* label → re-slug.
      id = `${slugify(labelDe).slice(0, 40)}-${attempt + 1}`;
    }
  }
}

/**
 * Resolve free-text labels (in the user's language) to canonical concept ids,
 * creating new bilingual concepts for labels that don't exist yet.
 * Order/dedup preserved by first occurrence; empty labels are dropped.
 * Translation failures degrade gracefully: the concept is stored
 * monolingually and can be backfilled later.
 */
export async function canonicalizeLabels(
  labels: string[],
  locale: SkillLocale = "de",
): Promise<string[]> {
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const raw of labels) {
    const label = normalizeLabel(raw ?? "");
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push(label);
  }
  if (clean.length === 0) return [];

  const resolved = new Map<string, string>(); // lower(input) → concept id

  // Pass 1: direct hits on either language column.
  const misses: string[] = [];
  for (const label of clean) {
    const row = await findConcept(label);
    if (!row) {
      misses.push(label);
      continue;
    }
    resolved.set(label.toLowerCase(), row.id);
    // Same spelling in both languages (e.g. "Marketing"): record that fact.
    if (
      locale === "en" &&
      !row.label_en &&
      row.label.toLowerCase() === label.toLowerCase()
    ) {
      await fillLabelEn(row.id, label);
    }
  }

  // Pass 2: translate the misses in one batch, so cross-language inputs land
  // on existing concepts; whatever remains becomes a new bilingual concept.
  let translations: (string | null)[] = misses.map(() => null);
  if (misses.length && mistralConfigured) {
    try {
      translations = await translateSkillLabels(
        misses,
        locale === "en" ? "de" : "en",
      );
    } catch (err) {
      console.error("[skills] label translation failed", err);
    }
  }

  for (let i = 0; i < misses.length; i++) {
    const input = misses[i];
    const counterpart = translations[i];

    if (counterpart && counterpart.toLowerCase() !== input.toLowerCase()) {
      const row = await findConcept(counterpart);
      if (row) {
        resolved.set(input.toLowerCase(), row.id);
        if (locale === "en" && !row.label_en) await fillLabelEn(row.id, input);
        continue;
      }
    }

    // New concept. German is the canonical column; when the input is English
    // and translation failed, the input doubles as the canonical label.
    const labelDe = locale === "en" ? (counterpart ?? input) : input;
    const labelEn = locale === "en" ? input : counterpart;
    await insertConcept(labelDe, labelEn);
    const { rows } = await pool.query<{ id: string }>(
      `select id from skills where lower(label) = lower($1)`,
      [labelDe],
    );
    if (rows[0]) resolved.set(input.toLowerCase(), rows[0].id);
  }

  return clean
    .map((label) => resolved.get(label.toLowerCase()))
    .filter((id): id is string => Boolean(id));
}
