import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Context, Next } from "hono";
import { sign, verify } from "hono/jwt";

const JWT_SECRET = process.env.JWT_SECRET ?? "";
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    // Refuse to boot with forgeable sessions in production.
    throw new Error("JWT_SECRET is not set — refusing to start with insecure sessions.");
  }
  console.warn("[auth] JWT_SECRET is not set — using an insecure dev default. Set JWT_SECRET in production.");
}
const SECRET = JWT_SECRET || "dev-insecure-secret-change-me";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type AuthEnv = { Variables: { userId: string } };

/** A random magic-link token plus the hash we persist. */
export function generateToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function issueJwt(userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign({ sub: userId, iat: now, exp: now + SESSION_TTL_SECONDS }, SECRET);
}

async function verifyJwt(token: string): Promise<string | null> {
  try {
    const payload = await verify(token, SECRET, "HS256");
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Capability token granting read access to one user's avatar image — <img>
 *  tags can't send Authorization headers, so the URL itself carries the proof.
 *  exp is bucket-aligned: the URL stays byte-identical within a bucket (browser
 *  cache keeps working despite polling) and is valid for 1–2 buckets. The
 *  "avatar." prefix domain-separates the HMAC from any future use of SECRET. */
export function avatarToken(userId: string, bucketSeconds = 3600): string {
  const exp = (Math.floor(Date.now() / 1000 / bucketSeconds) + 2) * bucketSeconds;
  const sig = createHmac("sha256", SECRET)
    .update(`avatar.${userId}.${exp}`)
    .digest("base64url");
  return `${exp}.${sig}`;
}

export function verifyAvatarToken(userId: string, token: string): boolean {
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const exp = Number(token.slice(0, dot));
  if (!Number.isSafeInteger(exp) || exp <= Math.floor(Date.now() / 1000)) return false;
  const expected = createHmac("sha256", SECRET)
    .update(`avatar.${userId}.${exp}`)
    .digest();
  let given: Buffer;
  try {
    given = Buffer.from(token.slice(dot + 1), "base64url");
  } catch {
    return false;
  }
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Middleware: require a valid Bearer JWT, expose userId on the context. */
export async function requireAuth(c: Context<AuthEnv>, next: Next) {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const userId = token ? await verifyJwt(token) : null;
  if (!userId) return c.json({ error: "unauthorized" }, 401);
  c.set("userId", userId);
  await next();
}
