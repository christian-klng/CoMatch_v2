import { Hono } from "hono";
import { pool } from "../db.js";

export const health = new Hono();

// Liveness + DB reachability — used by Coolify health checks.
health.get("/", async (c) => {
  try {
    await pool.query("select 1");
    return c.json({ status: "ok", db: "up" });
  } catch {
    return c.json({ status: "degraded", db: "down" }, 503);
  }
});
