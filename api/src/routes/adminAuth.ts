import { Hono } from "hono";
import { pool } from "../db.js";
import {
  type AdminEnv,
  issueAdminJwt,
  requireAdmin,
  verifyPassword,
} from "../adminAuth.js";
import { clientIp, rateLimit } from "../ratelimit.js";

// Email + password login for the Admin SPA. Admin accounts live in `admin_users`
// and are created via the `admin:create` CLI script — there is no signup here.
export const adminAuth = new Hono<AdminEnv>();

const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// POST /api/admin/auth/login { email, password } → { token }
adminAuth.post("/login", async (c) => {
  const body = await c.req
    .json<{ email?: string; password?: string }>()
    .catch(() => ({}) as { email?: string; password?: string });
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  if (!email || !password) {
    return c.json({ error: "invalid_credentials" }, 401);
  }

  // Throttle brute-force: per-email caps guessing one account, per-IP caps
  // spraying many. Checked before the DB lookup / scrypt work.
  const ip = clientIp(c.req.header("x-forwarded-for"), c.req.header("x-real-ip"));
  const byEmail = rateLimit(`admin:login:email:${email}`, 10, RATE_WINDOW_MS);
  const byIp = rateLimit(`admin:login:ip:${ip}`, 30, RATE_WINDOW_MS);
  if (!byEmail.ok || !byIp.ok) {
    const retryAfter = Math.max(byEmail.retryAfter, byIp.retryAfter);
    c.header("Retry-After", String(retryAfter));
    return c.json({ error: "rate_limited", retryAfter }, 429);
  }

  const { rows } = await pool.query<{ id: string; password_hash: string }>(
    `select id, password_hash from admin_users where email = $1 limit 1`,
    [email],
  );
  const admin = rows[0];
  // Generic error in all cases — never reveal whether the email exists.
  if (!admin || !verifyPassword(password, admin.password_hash)) {
    return c.json({ error: "invalid_credentials" }, 401);
  }

  await pool.query(`update admin_users set last_login_at = now() where id = $1`, [admin.id]);
  const token = await issueAdminJwt(admin.id);
  return c.json({ token });
});

// GET /api/admin/auth/me (Bearer) → { id, email } — lets the SPA validate a
// stored token on startup.
adminAuth.get("/me", requireAdmin, async (c) => {
  const { rows } = await pool.query<{ id: string; email: string }>(
    `select id, email from admin_users where id = $1`,
    [c.get("adminId")],
  );
  if (!rows[0]) return c.json({ error: "not_found" }, 404);
  return c.json(rows[0]);
});
