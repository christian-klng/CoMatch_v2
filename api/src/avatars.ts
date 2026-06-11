import type { Context } from "hono";
import { avatarToken } from "./auth.js";

/** Public base URL of this API, derived from the proxy's forwarded headers so
 *  we don't need to hardcode the domain (self-configuring, no stale value). */
export function apiBaseUrl(c: Context): string {
  const proto = c.req.header("x-forwarded-proto") ?? "http";
  const host = c.req.header("x-forwarded-host") ?? c.req.header("host") ?? "";
  return `${proto}://${host}`;
}

/** The URL a client should use for a user's avatar:
 *  - self-hosted photo (avatar_data present) → signed, expiring capability URL
 *  - external URL only (seed users) → passed through untouched
 *  - neither → null (the Avatar component shows initials) */
export function resolveAvatarUrl(
  c: Context,
  user: { id: string; avatarUrl: string | null; hasAvatarData: boolean },
  bucketSeconds?: number,
): string | null {
  if (user.hasAvatarData) {
    return `${apiBaseUrl(c)}/api/users/${user.id}/avatar?t=${avatarToken(user.id, bucketSeconds)}`;
  }
  return user.avatarUrl;
}
