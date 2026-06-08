import type { Person } from "./types";

// Base URL of the API, baked in at build time via the VITE_API_URL build-arg.
// Empty string falls back to same-origin (only correct if API is reverse-proxied).
const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

if (!BASE && import.meta.env.PROD) {
  console.warn(
    "[api] VITE_API_URL is empty — set it as a build arg in Coolify and redeploy " +
      "the frontend, otherwise API calls hit the wrong origin.",
  );
}

// Temporary identity until real auth exists. Anna (seed user) acts as the
// logged-in viewer and sees the other community members as her matches.
export const DEMO_VIEWER_ID = "00000000-0000-0000-0000-0000000000a1";
export const DEMO_COMMUNITY_ID = "00000000-0000-0000-0000-0000000000c1";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

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
