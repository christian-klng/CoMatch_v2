import { Hono } from "hono";
import { pool } from "../db.js";
import { type AuthEnv, requireAuth } from "../auth.js";
import { canonicalizeLabels } from "../skillcatalog.js";

export const skills = new Hono<AuthEnv>();

// Controlled skill vocabulary for the "ich suche / ich kann" picker.
skills.get("/", async (c) => {
  const { rows } = await pool.query("select id, label from skills order by label");
  return c.json(rows);
});

// POST /api/skills { label } → canonicalise a user-entered free-text label into
// a skill row (reusing an existing one case-insensitively, inserting otherwise)
// and return it, so the picker can select it immediately.
skills.post("/", requireAuth, async (c) => {
  const body = await c.req
    .json<{ label?: string }>()
    .catch(() => ({}) as { label?: string });
  const label = body.label?.trim().replace(/\s+/g, " ") ?? "";
  if (!label || label.length > 80) return c.json({ error: "invalid_label" }, 400);

  const [id] = await canonicalizeLabels([label]);
  if (!id) return c.json({ error: "invalid_label" }, 400);

  // Return the canonical row — an existing skill may differ in casing.
  const { rows } = await pool.query<{ id: string; label: string }>(
    `select id, label from skills where id = $1`,
    [id],
  );
  return c.json(rows[0]);
});
