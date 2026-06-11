import { Hono } from "hono";
import { pool } from "../db.js";
import { type AuthEnv, requireAuth } from "../auth.js";
import { canonicalizeLabels } from "../skillcatalog.js";

export const skills = new Hono<AuthEnv>();

// Skill vocabulary for the "ich suche / ich kann" picker. Both language
// variants ship; the client picks per UI language (labelEn falls back to
// label while a concept is untranslated).
skills.get("/", async (c) => {
  const { rows } = await pool.query(
    `select id, label, label_en as "labelEn" from skills order by label`,
  );
  return c.json(rows);
});

// POST /api/skills { label, lang? } → canonicalise a user-entered free-text
// label (in the given language) into a skill concept — reusing an existing one
// across BOTH languages, inserting otherwise — and return it, so the picker
// can select it immediately.
skills.post("/", requireAuth, async (c) => {
  const body = await c.req
    .json<{ label?: string; lang?: string }>()
    .catch(() => ({}) as { label?: string; lang?: string });
  const label = body.label?.trim().replace(/\s+/g, " ") ?? "";
  if (!label || label.length > 80) return c.json({ error: "invalid_label" }, 400);
  const lang = body.lang === "en" ? "en" : "de";

  const [id] = await canonicalizeLabels([label], lang);
  if (!id) return c.json({ error: "invalid_label" }, 400);

  // Return the canonical row — an existing skill may differ in casing/language.
  const { rows } = await pool.query<{ id: string; label: string; labelEn: string | null }>(
    `select id, label, label_en as "labelEn" from skills where id = $1`,
    [id],
  );
  return c.json(rows[0]);
});
