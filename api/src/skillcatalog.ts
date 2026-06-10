// Canonicalisation for the (now open) skill vocabulary. Skills are matched by
// label (see matches.ts), so the job here is: take free-text labels, normalise
// them, and resolve each to exactly one canonical `skills` row — reusing an
// existing one when the label already exists, inserting a new one otherwise.
import { pool } from "./db.js";

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

/**
 * Resolve free-text labels to canonical skill ids, creating new `skills` rows
 * for labels that don't exist yet (source = 'llm'). Order/dedup preserved by
 * first occurrence; empty labels are dropped. The unique index on lower(label)
 * (migration 008) is what makes the upsert race-safe and dedup reliable.
 */
export async function canonicalizeLabels(labels: string[]): Promise<string[]> {
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

  const ids: string[] = [];
  for (const label of clean) {
    // Insert if new; either way fetch the canonical id by lower(label). Slug
    // collisions across different labels are avoided by suffixing on conflict.
    let id = slugify(label);
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await pool.query(
          `insert into skills (id, label, source) values ($1, $2, 'llm')
           on conflict (lower(label)) do nothing`,
          [id, label],
        );
        break;
      } catch (e: unknown) {
        // id (primary key) already taken by a *different* label → re-slug.
        if ((e as { code?: string })?.code === "23505") {
          id = `${slugify(label).slice(0, 40)}-${attempt + 1}`;
          continue;
        }
        throw e;
      }
    }
    const { rows } = await pool.query<{ id: string }>(
      `select id from skills where lower(label) = lower($1)`,
      [label],
    );
    if (rows[0]) ids.push(rows[0].id);
  }
  return ids;
}
