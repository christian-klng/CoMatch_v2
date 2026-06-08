import { Hono } from "hono";
import { pool } from "../db.js";

// Lean community admin. NO AUTH YET — intentionally open for the single
// pre-launch operator. Lock this behind an admin role + auth before any
// public exposure (tracked as a follow-up).
export const admin = new Hono();

const COMMUNITY_COLS = `
  c.id, c.name, c.context, c.code, c.published,
  c.created_at as "createdAt",
  (select count(*)::int from community_members m where m.community_id = c.id) as "memberCount"
`;

/** Random 8-digit code; first digit 1-9 so it's always 8 chars long. */
function randomCode(): string {
  let s = String(1 + Math.floor(Math.random() * 9));
  for (let i = 0; i < 7; i++) s += Math.floor(Math.random() * 10);
  return s;
}

// GET /api/admin/communities → all communities, newest first.
admin.get("/communities", async (c) => {
  const { rows } = await pool.query(
    `select ${COMMUNITY_COLS} from communities c order by c.created_at desc`,
  );
  return c.json(rows);
});

// POST /api/admin/communities { name, context?, published? } → create with a
// freshly generated unique code.
admin.post("/communities", async (c) => {
  const body = await c.req
    .json<{ name?: string; context?: string; published?: boolean }>()
    .catch(() => ({}) as { name?: string; context?: string; published?: boolean });
  const name = body.name?.trim();
  if (!name) return c.json({ error: "name required" }, 400);
  const context = body.context?.trim() || null;
  const published = Boolean(body.published);

  // Retry on the rare code collision against the unique constraint.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    try {
      const { rows } = await pool.query(
        `with inserted as (
           insert into communities (name, context, code, published)
           values ($1, $2, $3, $4)
           returning id, name, context, code, published, created_at
         )
         select i.id, i.name, i.context, i.code, i.published,
                i.created_at as "createdAt", 0 as "memberCount"
           from inserted i`,
        [name, context, code, published],
      );
      return c.json(rows[0], 201);
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === "23505") continue; // code taken → retry
      throw e;
    }
  }
  return c.json({ error: "could not allocate a unique code" }, 500);
});

// PATCH /api/admin/communities/:id { name?, context?, published? }
admin.patch("/communities/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req
    .json<{ name?: string; context?: string; published?: boolean }>()
    .catch(() => ({}) as { name?: string; context?: string; published?: boolean });

  const { rows } = await pool.query(
    `update communities c set
       name = coalesce($2, c.name),
       context = coalesce($3, c.context),
       published = coalesce($4, c.published)
     where c.id = $1
     returning ${COMMUNITY_COLS}`,
    [
      id,
      body.name?.trim() ?? null,
      body.context !== undefined ? body.context.trim() || null : null,
      typeof body.published === "boolean" ? body.published : null,
    ],
  );
  if (rows.length === 0) return c.json({ error: "not_found" }, 404);
  return c.json(rows[0]);
});

// DELETE /api/admin/communities/:id
admin.delete("/communities/:id", async (c) => {
  const { rowCount } = await pool.query(`delete from communities where id = $1`, [
    c.req.param("id"),
  ]);
  if (!rowCount) return c.json({ error: "not_found" }, 404);
  return c.json({ ok: true });
});
