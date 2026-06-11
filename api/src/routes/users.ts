import { Hono } from "hono";
import { pool } from "../db.js";
import { verifyAvatarToken } from "../auth.js";

export const users = new Hono();

// GET /api/users/:id/avatar?t=<token> → the user's stored profile picture.
// Guarded by a signed, expiring token: photos are part of the match
// anonymisation (hidden until connected), so this endpoint must not be
// publicly enumerable via user ids. Tokens are minted only where the API
// decides the caller may see the photo (own profile, connected matches).
users.get("/:id/avatar", async (c) => {
  const id = c.req.param("id");
  const token = c.req.query("t");
  // Verify before touching the DB — no cost for scans, no existence oracle.
  if (!id || !token || !verifyAvatarToken(id, token)) {
    return c.json({ error: "forbidden" }, 403);
  }

  const { rows } = await pool.query<{ avatar_data: Buffer | null; avatar_mime: string | null }>(
    `select avatar_data, avatar_mime from users where id = $1`,
    [id],
  );
  const row = rows[0];
  if (!row?.avatar_data) return c.json({ error: "not_found" }, 404);

  return c.body(new Uint8Array(row.avatar_data), 200, {
    "Content-Type": row.avatar_mime ?? "image/jpeg",
    // private: signed URLs must not be served from shared caches; max-age
    // matches the token bucket — the URL rotates before the cache can stale.
    "Cache-Control": "private, max-age=3600",
  });
});
