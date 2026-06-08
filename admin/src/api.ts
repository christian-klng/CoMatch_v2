import type { AdminCommunity } from "./types";

// Base URL of the API, baked in at build time via the VITE_API_URL build-arg
// (set it in Coolify, same value the frontend uses).
const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

if (!BASE && import.meta.env.PROD) {
  console.warn("[admin] VITE_API_URL is empty — set it as a build arg in Coolify.");
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export function listCommunities(): Promise<AdminCommunity[]> {
  return call<AdminCommunity[]>("GET", "/api/admin/communities");
}

export function createCommunity(input: {
  name: string;
  context?: string;
  published?: boolean;
}): Promise<AdminCommunity> {
  return call<AdminCommunity>("POST", "/api/admin/communities", input);
}

export function updateCommunity(
  id: string,
  patch: { name?: string; context?: string; published?: boolean },
): Promise<AdminCommunity> {
  return call<AdminCommunity>("PATCH", `/api/admin/communities/${id}`, patch);
}

export function deleteCommunity(id: string): Promise<{ ok: true }> {
  return call<{ ok: true }>("DELETE", `/api/admin/communities/${id}`);
}
