// Minimal in-memory fixed-window rate limiter. Sufficient for a single API
// instance; if we ever scale to multiple instances, move this to Redis.
type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();

export type RateResult = { ok: boolean; retryAfter: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();

  // Opportunistic sweep so the map can't grow unbounded over time.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
  }

  const hit = buckets.get(key);
  if (!hit || now >= hit.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  hit.count++;
  if (hit.count > limit) {
    return { ok: false, retryAfter: Math.ceil((hit.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

/** Best-effort client IP behind the Coolify/Traefik proxy. */
export function clientIp(forwardedFor?: string, realIp?: string): string {
  return forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
}
