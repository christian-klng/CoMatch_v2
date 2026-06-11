import { Hono } from "hono";
import { pool } from "../db.js";
import { type AuthEnv, requireAuth } from "../auth.js";

export const connections = new Hono<AuthEnv>();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/connections { userId } → request a connection to userId. If that
// user already has a pending request TO the viewer, this accepts it instead
// (both sides want it — no reason to leave it dangling). Returns the resulting
// status from the viewer's perspective: "requested" | "connected".
connections.post("/", requireAuth, async (c) => {
  const viewerId = c.get("userId");
  const body = await c.req
    .json<{ userId?: string }>()
    .catch(() => ({}) as { userId?: string });
  const targetId = body.userId;
  if (!targetId || !UUID_RE.test(targetId) || targetId === viewerId) {
    return c.json({ error: "invalid_user" }, 400);
  }

  // Same pool rule as matching: you can only connect to people who share at
  // least one community with you.
  const shared = await pool.query(
    `select 1
       from community_members a
       join community_members b on b.community_id = a.community_id
      where a.user_id = $1 and b.user_id = $2
      limit 1`,
    [viewerId, targetId],
  );
  if (shared.rows.length === 0) return c.json({ error: "not_in_pool" }, 404);

  // An existing relationship in either direction wins — never create a second,
  // opposite-direction row for the same pair.
  const existing = await pool.query<{ requester_id: string; status: string }>(
    `select requester_id, status from connections
      where (requester_id = $1 and addressee_id = $2)
         or (requester_id = $2 and addressee_id = $1)
      limit 1`,
    [viewerId, targetId],
  );
  const row = existing.rows[0];
  if (row) {
    if (row.status === "connected") return c.json({ status: "connected" });
    if (row.requester_id === viewerId) return c.json({ status: "requested" });
    // Pending request from them to us → both sides want it, accept it.
    await pool.query(
      `update connections set status = 'connected'
        where requester_id = $2 and addressee_id = $1`,
      [viewerId, targetId],
    );
    return c.json({ status: "connected" });
  }

  await pool.query(
    `insert into connections (requester_id, addressee_id) values ($1, $2)
     on conflict do nothing`,
    [viewerId, targetId],
  );
  return c.json({ status: "requested" });
});

// POST /api/connections/:userId/accept → accept that user's pending request.
connections.post("/:userId/accept", requireAuth, async (c) => {
  const viewerId = c.get("userId");
  const requesterId = c.req.param("userId");
  if (!requesterId || !UUID_RE.test(requesterId)) {
    return c.json({ error: "invalid_user" }, 400);
  }

  const { rows } = await pool.query(
    `update connections set status = 'connected'
      where requester_id = $2 and addressee_id = $1 and status = 'requested'
      returning 1`,
    [viewerId, requesterId],
  );
  if (rows.length === 0) return c.json({ error: "no_pending_request" }, 404);
  return c.json({ status: "connected" });
});
