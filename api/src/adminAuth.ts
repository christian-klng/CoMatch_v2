import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Context, Next } from "hono";
import { sign, verify } from "hono/jwt";
import { SECRET } from "./auth.js";

// Admin sessions are deliberately separate from user sessions: the token carries
// a `scope: "admin"` claim so an admin token can't be replayed against user
// routes and a user token can't reach `/api/admin/*`. Same signing SECRET as the
// user JWTs (single source in auth.ts).

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const SCRYPT_KEYLEN = 64;

export type AdminEnv = { Variables: { adminId: string } };

/** Hash a password for storage. Format: scrypt$<saltHex>$<hashHex>. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

/** Constant-time check of a password against a stored scrypt$salt$hash string. */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[1], "hex");
    expected = Buffer.from(parts[2], "hex");
  } catch {
    return false;
  }
  if (expected.length !== SCRYPT_KEYLEN) return false;
  const actual = scryptSync(password, salt, SCRYPT_KEYLEN);
  return timingSafeEqual(actual, expected);
}

export function issueAdminJwt(adminId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign({ sub: adminId, scope: "admin", iat: now, exp: now + SESSION_TTL_SECONDS }, SECRET);
}

async function verifyAdminJwt(token: string): Promise<string | null> {
  try {
    const payload = await verify(token, SECRET, "HS256");
    if (payload.scope !== "admin") return null;
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Middleware: require a valid admin Bearer JWT, expose adminId on the context. */
export async function requireAdmin(c: Context<AdminEnv>, next: Next) {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const adminId = token ? await verifyAdminJwt(token) : null;
  if (!adminId) return c.json({ error: "unauthorized" }, 401);
  c.set("adminId", adminId);
  await next();
}
