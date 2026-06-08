import type { AuthUser, Person } from "./types";

// Base URL of the API, baked in at build time via the VITE_API_URL build-arg.
// Empty string falls back to same-origin (only correct if API is reverse-proxied).
const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

if (!BASE && import.meta.env.PROD) {
  console.warn(
    "[api] VITE_API_URL is empty — set it as a build arg in Coolify and redeploy " +
      "the frontend, otherwise API calls hit the wrong origin.",
  );
}

// --- Session token storage ------------------------------------------------
const TOKEN_KEY = "comatch_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

// --- Domain data ----------------------------------------------------------
// Temporary identity until the logged-in user is threaded into matches
// (needs onboarding: join community + save skills). See setConnection note.
export const DEMO_VIEWER_ID = "00000000-0000-0000-0000-0000000000a1";
export const DEMO_COMMUNITY_ID = "00000000-0000-0000-0000-0000000000c1";

export interface SkillOption {
  id: string;
  label: string;
}

export function fetchSkills(): Promise<SkillOption[]> {
  return getJson<SkillOption[]>("/api/skills");
}

export function fetchMatches(): Promise<Person[]> {
  const q = new URLSearchParams({
    viewer: DEMO_VIEWER_ID,
    community: DEMO_COMMUNITY_ID,
  });
  return getJson<Person[]>(`/api/matches?${q.toString()}`);
}

// --- Auth (magic link) ----------------------------------------------------
export function apiRequestMagicLink(email: string): Promise<{ ok: true }> {
  return postJson("/api/auth/request", { email });
}

export function apiVerifyMagicLink(token: string): Promise<{ token: string; user: AuthUser }> {
  return postJson("/api/auth/verify", { token });
}

export function apiMe(): Promise<AuthUser> {
  return getJson<AuthUser>("/api/auth/me");
}
