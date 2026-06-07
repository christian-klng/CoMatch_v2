import { Hono } from "hono";
import { pool } from "../db.js";

export const skills = new Hono();

// Controlled skill vocabulary for the "ich suche / ich kann" picker.
skills.get("/", async (c) => {
  const { rows } = await pool.query("select id, label from skills order by label");
  return c.json(rows);
});
