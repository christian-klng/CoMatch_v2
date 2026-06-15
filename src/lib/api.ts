import { currentLocale } from "../i18n";
import type { AdminCommunity, AuthUser, Community, Person } from "./types";

// Base URL of the API, baked in at build time via the VITE_API_URL build-arg.
// Empty string falls back to same-origin (only correct if API is reverse-proxied).
const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

if (!BASE && import.meta.env.PROD) {
  console.warn(
    "[api] VITE_API_URL is empty — set it as a build arg in Coolify and redeploy " +
      "the frontend, otherwise API calls hit the wrong origin.",
  );
}

/** Error carrying the HTTP status, so callers can branch on e.g. 404. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
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
  if (!res.ok) throw new ApiError(res.status, `GET ${path} → ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

async function sendJson<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, `${method} ${path} → ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

const postJson = <T>(path: string, body: unknown) => sendJson<T>("POST", path, body);

// --- Domain data ----------------------------------------------------------
export interface SkillOption {
  id: string;
  /** German (canonical) label. */
  label: string;
  /** English label; null until the concept has been translated. */
  labelEn?: string | null;
}

/** Display label for the app's current language (EN falls back to German
 *  while a concept's translation is still missing). */
export function skillLabel(skill: SkillOption): string {
  return currentLocale() === "en" ? (skill.labelEn ?? skill.label) : skill.label;
}

export function fetchSkills(): Promise<SkillOption[]> {
  return getJson<SkillOption[]>("/api/skills");
}

/** Create (or case-insensitively reuse) a skill from free text → canonical chip.
 *  The current UI language tells the API which language the label is in. */
export function apiCreateSkill(label: string): Promise<SkillOption> {
  return postJson<SkillOption>("/api/skills", { label, lang: currentLocale() });
}

/** Matches for the logged-in user, pooled across all their communities.
 *  Skill labels come back localized for the current UI language. */
export function fetchMatches(): Promise<Person[]> {
  return getJson<Person[]>(`/api/matches?lang=${currentLocale()}`);
}

/** The logged-in user's saved seeks/offers (catalog skill ids). */
export function apiGetMySkills(): Promise<{ seeks: string[]; offers: string[] }> {
  return getJson<{ seeks: string[]; offers: string[] }>("/api/me/skills");
}

/** Replace the logged-in user's seeks/offers with the given catalog ids. */
export function apiSaveMySkills(seeks: string[], offers: string[]): Promise<{ ok: true }> {
  return sendJson<{ ok: true }>("PUT", "/api/me/skills", { seeks, offers });
}

/** Persist the user's explicit language choice (for emails etc.). */
export function apiSetLocale(locale: "de" | "en"): Promise<{ ok: true }> {
  return sendJson<{ ok: true }>("PUT", "/api/me/locale", { locale });
}

/** Update the editable profile fields (name required, rest clearable). */
export function apiUpdateProfile(data: {
  name: string;
  role: string;
  company: string;
  bio: string;
}): Promise<{ ok: true }> {
  return sendJson<{ ok: true }>("PUT", "/api/me/profile", data);
}

/** Save the user's LinkedIn URL (consent required) and trigger a profile read.
 *  `profileFetched` is false if the read failed; `reason` says why
 *  (`fetch_failed` = profile not found/unreachable, `unipile_not_configured`
 *  = import disabled server-side). */
export function apiSaveLinkedin(
  url: string,
  consent: boolean,
): Promise<{ ok: true; profileFetched: boolean; reason?: string }> {
  return sendJson<{ ok: true; profileFetched: boolean; reason?: string }>(
    "POST",
    "/api/me/linkedin",
    { url, consent },
  );
}

/** Remove LinkedIn URL, profile data, avatar and skill suggestions. */
export function apiDeleteLinkedin(): Promise<{ ok: true }> {
  return sendJson<{ ok: true }>("DELETE", "/api/me/linkedin");
}

export interface SkillSuggestions {
  seeks: string[];
  offers: string[];
}

/** Stored suggestions plus status: whether a LinkedIn profile is ready to
 *  analyse, and whether suggestions have already been generated. */
export interface SkillSuggestionState extends SkillSuggestions {
  profileReady: boolean;
  generated: boolean;
}

/** Generate AI skill suggestions from the stored LinkedIn profile (Mistral),
 *  in the app's current UI language. */
export function apiGenerateSkillSuggestions(): Promise<SkillSuggestions> {
  return sendJson<SkillSuggestions>("POST", "/api/me/skill-suggestions", {
    lang: currentLocale(),
  });
}

/** The user's stored AI skill suggestions (catalog ids) plus generation status. */
export function apiGetSkillSuggestions(): Promise<SkillSuggestionState> {
  return getJson<SkillSuggestionState>("/api/me/skill-suggestions");
}

// --- Connections ------------------------------------------------------------
/** Request a connection to a user from the match pool. The server accepts
 *  automatically if that user already has a pending request to us. */
export function apiRequestConnection(
  userId: string,
): Promise<{ status: "requested" | "connected" }> {
  return postJson<{ status: "requested" | "connected" }>("/api/connections", { userId });
}

/** Accept a pending incoming connection request from that user. */
export function apiAcceptConnection(userId: string): Promise<{ status: "connected" }> {
  return postJson<{ status: "connected" }>(
    `/api/connections/${encodeURIComponent(userId)}/accept`,
    {},
  );
}

// --- Communities (membership) ---------------------------------------------
/** Communities the current user belongs to. */
export function apiMyCommunities(): Promise<Community[]> {
  return getJson<Community[]>("/api/communities/mine");
}

/** Resolve a published community by its 8-digit code (preview before joining). */
export function apiCommunityByCode(code: string): Promise<Community> {
  return getJson<Community>(`/api/communities/by-code/${encodeURIComponent(code)}`);
}

/** Join a published community by code. Throws ApiError(404) on an invalid code. */
export function apiJoinCommunity(code: string): Promise<Community> {
  return postJson<Community>("/api/communities/join", { code });
}

// --- Admin (no auth yet) --------------------------------------------------
export function apiAdminListCommunities(): Promise<AdminCommunity[]> {
  return getJson<AdminCommunity[]>("/api/admin/communities");
}

export function apiAdminCreateCommunity(input: {
  name: string;
  context?: string;
  published?: boolean;
}): Promise<AdminCommunity> {
  return postJson<AdminCommunity>("/api/admin/communities", input);
}

export function apiAdminUpdateCommunity(
  id: string,
  patch: { name?: string; context?: string; published?: boolean },
): Promise<AdminCommunity> {
  return sendJson<AdminCommunity>("PATCH", `/api/admin/communities/${id}`, patch);
}

export function apiAdminDeleteCommunity(id: string): Promise<{ ok: true }> {
  return sendJson<{ ok: true }>("DELETE", `/api/admin/communities/${id}`);
}

// --- Auth (magic link) ----------------------------------------------------
export function apiRequestMagicLink(email: string): Promise<{ ok: true }> {
  // The UI language rides along so the magic-link email arrives in it.
  return postJson("/api/auth/request", { email, locale: currentLocale() });
}

export function apiVerifyMagicLink(token: string): Promise<{ token: string; user: AuthUser }> {
  return postJson("/api/auth/verify", { token });
}

export function apiMe(): Promise<AuthUser> {
  return getJson<AuthUser>("/api/auth/me");
}
