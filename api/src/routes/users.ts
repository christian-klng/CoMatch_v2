import { Hono } from "hono";
import { pool } from "../db.js";

export const users = new Hono();

// GET /api/users/:id/avatar → the user's stored profile picture (bytes).
// Public, like any profile image. 404 if the user has no stored avatar.
users.get("/:id/avatar", async (c) => {
  const { rows } = await pool.query<{ avatar_data: Buffer | null; avatar_mime: string | null }>(
    `select avatar_data, avatar_mime from users where id = $1`,
    [c.req.param("id")],
  );
  const row = rows[0];
  if (!row?.avatar_data) return c.json({ error: "not_found" }, 404);

  return c.body(new Uint8Array(row.avatar_data), 200, {
    "Content-Type": row.avatar_mime ?? "image/jpeg",
    "Cache-Control": "public, max-age=86400",
  });
});
