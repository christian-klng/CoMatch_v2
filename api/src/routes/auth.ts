import { Hono } from "hono";
import type { Context } from "hono";
import { pool } from "../db.js";
import { resolveAvatarUrl } from "../avatars.js";
import {
  type AuthEnv,
  generateToken,
  hashToken,
  issueJwt,
  requireAuth,
} from "../auth.js";
import { sendMagicLink } from "../mailer.js";
import { randomFirstName } from "../names.js";
import { clientIp, rateLimit } from "../ratelimit.js";

export const auth = new Hono<AuthEnv>();

const APP_URL = (process.env.APP_URL ?? "").replace(/\/$/, "");
const TOKEN_TTL_MINUTES = 15;
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// POST /api/auth/request { email } → create/find user, email a magic link.
// Passwordless: requesting a link for a new email signs the user up.
auth.post("/request", async (c) => {
  const body = await c.req.json<{ email?: string }>().catch(() => ({}) as { email?: string });
  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return c.json({ error: "valid email required" }, 400);
  }

  // Rate-limit before any DB write or mail send, so this endpoint can't be
  // abused to spam an inbox or to relay mail through our SMTP account.
  // Per-email caps flooding one address; per-IP caps enumerating many.
  const ip = clientIp(c.req.header("x-forwarded-for"), c.req.header("x-real-ip"));
  const byEmail = rateLimit(`auth:email:${email}`, 3, RATE_WINDOW_MS);
  const byIp = rateLimit(`auth:ip:${ip}`, 15, RATE_WINDOW_MS);
  if (!byEmail.ok || !byIp.ok) {
    const retryAfter = Math.max(byEmail.retryAfter, byIp.retryAfter);
    c.header("Retry-After", String(retryAfter));
    return c.json({ error: "rate_limited", retryAfter }, 429);
  }

  // New users get a random first name so they are never anonymous on match
  // cards; a LinkedIn import later replaces it with the real first name. The
  // conflict branch leaves an existing user's name untouched.
  const { rows } = await pool.query<{ id: string }>(
    `insert into users (email, name) values ($1, $2)
     on conflict (email) do update set email = excluded.email
     returning id`,
    [email, randomFirstName()],
  );
  const userId = rows[0].id;

  const { token, hash } = generateToken();
  await pool.query(
    `insert into auth_tokens (user_id, token_hash, expires_at)
     values ($1, $2, now() + ($3 || ' minutes')::interval)`,
    [userId, hash, String(TOKEN_TTL_MINUTES)],
  );

  await sendMagicLink(email, `${APP_URL}/auth/verify?token=${token}`);

  // Generic response — never reveal whether the email already had an account.
  return c.json({ ok: true });
});

// POST /api/auth/verify { token } → consume token, return a session JWT + user.
auth.post("/verify", async (c) => {
  const body = await c.req.json<{ token?: string }>().catch(() => ({}) as { token?: string });
  const token = body.token;
  if (!token) return c.json({ error: "token required" }, 400);

  const { rows } = await pool.query<{ id: string; user_id: string }>(
    `select id, user_id from auth_tokens
      where token_hash = $1 and consumed_at is null and expires_at > now()
      limit 1`,
    [hashToken(token)],
  );
  if (rows.length === 0) return c.json({ error: "invalid_or_expired" }, 400);

  await pool.query(`update auth_tokens set consumed_at = now() where id = $1`, [rows[0].id]);

  const jwt = await issueJwt(rows[0].user_id);
  return c.json({ token: jwt, user: await getUser(c, rows[0].user_id) });
});

// GET /api/auth/me  (Bearer) → the current user.
auth.get("/me", requireAuth, async (c) => {
  const user = await getUser(c, c.get("userId"));
  if (!user) return c.json({ error: "not_found" }, 404);
  return c.json(user);
});

async function getUser(c: Context, id: string) {
  const { rows } = await pool.query(
    `select id, email, name, role, company,
            avatar_url as "avatarUrl", bio, attributes,
            linkedin_url as "linkedinUrl",
            (linkedin_profile is not null) as "linkedinProfileRead",
            (avatar_data is not null) as "hasAvatarData"
       from users where id = $1`,
    [id],
  );
  if (!rows[0]) return null;
  // Self-hosted photos are served via signed URLs. 24h bucket (valid 24–48h):
  // the user object is fetched once per app start and held in memory.
  const { hasAvatarData, ...user } = rows[0];
  return { ...user, avatarUrl: resolveAvatarUrl(c, rows[0], 86400) };
}
