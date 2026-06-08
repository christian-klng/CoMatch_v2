import { Hono } from "hono";
import { pool } from "../db.js";
import { type AuthEnv, requireAuth } from "../auth.js";

export const communities = new Hono<AuthEnv>();

const memberCount = `(select count(*)::int
   from community_members m where m.community_id = c.id) as "memberCount"`;

// GET /api/communities/by-code/:code → resolve a PUBLISHED community for the
// scan/join preview. Unpublished or unknown codes look identical (404), so the
// admin can prepare a community without it being joinable yet.
communities.get("/by-code/:code", async (c) => {
  const code = c.req.param("code").trim();
  const { rows } = await pool.query(
    `select c.id, c.name, c.code, c.context, ${memberCount}
       from communities c
      where c.code = $1 and c.published = true`,
    [code],
  );
  if (rows.length === 0) return c.json({ error: "not_found" }, 404);
  return c.json(rows[0]);
});

// GET /api/communities/mine → communities the current user belongs to.
communities.get("/mine", requireAuth, async (c) => {
  const { rows } = await pool.query(
    `select c.id, c.name, c.code, c.context, ${memberCount}
       from communities c
       join community_members mem on mem.community_id = c.id
      where mem.user_id = $1
      order by mem.joined_at desc`,
    [c.get("userId")],
  );
  return c.json(rows);
});

// POST /api/communities/join { code } → join a published community. Idempotent.
communities.post("/join", requireAuth, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ code?: string }>().catch(() => ({}) as { code?: string });
  const code = body.code?.trim();
  if (!code) return c.json({ error: "code required" }, 400);

  const found = await pool.query<{ id: string }>(
    `select id from communities where code = $1 and published = true`,
    [code],
  );
  if (found.rows.length === 0) return c.json({ error: "invalid_code" }, 404);
  const communityId = found.rows[0].id;

  await pool.query(
    `insert into community_members (community_id, user_id)
     values ($1, $2) on conflict do nothing`,
    [communityId, userId],
  );

  const { rows } = await pool.query(
    `select c.id, c.name, c.code, c.context, ${memberCount}
       from communities c where c.id = $1`,
    [communityId],
  );
  return c.json(rows[0]);
});
