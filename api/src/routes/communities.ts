import { Hono } from "hono";
import { pool } from "../db.js";

export const communities = new Hono();

// Resolve a community from a scanned QR join code.
communities.get("/by-code/:code", async (c) => {
  const code = c.req.param("code");
  const { rows } = await pool.query(
    `select c.id,
            c.name,
            c.join_code as "joinCode",
            c.context,
            (select count(*)::int
               from community_members m
              where m.community_id = c.id) as "memberCount"
       from communities c
      where c.join_code = $1`,
    [code],
  );
  if (rows.length === 0) return c.json({ error: "not_found" }, 404);
  return c.json(rows[0]);
});
