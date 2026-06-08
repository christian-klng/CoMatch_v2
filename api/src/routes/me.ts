import { Hono } from "hono";
import { pool } from "../db.js";
import { type AuthEnv, requireAuth } from "../auth.js";

export const me = new Hono<AuthEnv>();

// GET /api/me/skills → the logged-in user's seeks/offers as skill ids.
me.get("/skills", requireAuth, async (c) => {
  const { rows } = await pool.query<{ skill_id: string; kind: "seek" | "offer" }>(
    `select skill_id, kind from user_skills where user_id = $1`,
    [c.get("userId")],
  );
  return c.json({
    seeks: rows.filter((r) => r.kind === "seek").map((r) => r.skill_id),
    offers: rows.filter((r) => r.kind === "offer").map((r) => r.skill_id),
  });
});

// PUT /api/me/skills { seeks: string[], offers: string[] } → replace the user's
// skills. Only ids from the controlled catalog are stored (FK-safe); unknown
// ids are silently dropped. Custom free-text comes later (catalog v2).
me.put("/skills", requireAuth, async (c) => {
  const userId = c.get("userId");
  const body = await c.req
    .json<{ seeks?: string[]; offers?: string[] }>()
    .catch(() => ({}) as { seeks?: string[]; offers?: string[] });
  const seeks = [...new Set(body.seeks ?? [])];
  const offers = [...new Set(body.offers ?? [])];

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`delete from user_skills where user_id = $1`, [userId]);
    // Insert only ids that exist in the catalog (join filters unknowns).
    await client.query(
      `insert into user_skills (user_id, skill_id, kind)
       select $1, s.id, 'seek'
         from unnest($2::text[]) as t(id)
         join skills s on s.id = t.id
       on conflict do nothing`,
      [userId, seeks],
    );
    await client.query(
      `insert into user_skills (user_id, skill_id, kind)
       select $1, s.id, 'offer'
         from unnest($2::text[]) as t(id)
         join skills s on s.id = t.id
       on conflict do nothing`,
      [userId, offers],
    );
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }

  return c.json({ ok: true });
});
