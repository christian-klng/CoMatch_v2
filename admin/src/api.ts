import type { AdminCommunity, AdminMember, AdminSession, AdminUserDetail, AdminUserRow } from "./types";

// Base URL of the API, baked in at build time via the VITE_API_URL build-arg
// (set it in Coolify, same value the frontend uses).
const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

if (!BASE && import.meta.env.PROD) {
  console.warn("[admin] VITE_API_URL is empty — set it as a build arg in Coolify.");
}

// --- Session token ---------------------------------------------------------
const TOKEN_KEY = "comatch_admin_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Thrown when the API rejects the session (401) — the app drops to login. */
export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
    this.name = "UnauthorizedError";
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) {
    clearToken();
    throw new UnauthorizedError();
  }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

// --- Auth ------------------------------------------------------------------
/** Log in with email + password; stores the session token on success. */
export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${BASE}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error(`Login fehlgeschlagen (${res.status})`);
  const { token } = (await res.json()) as { token: string };
  setToken(token);
}

/** Validate the stored token and return the current admin, or null if none. */
export function fetchAdminMe(): Promise<AdminSession> {
  return call<AdminSession>("GET", "/api/admin/auth/me");
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

export function listMembers(communityId: string): Promise<AdminMember[]> {
  return call<AdminMember[]>("GET", `/api/admin/communities/${communityId}/members`);
}

export function addMember(
  communityId: string,
  input: { name: string; role?: string; email?: string; company?: string },
): Promise<AdminMember> {
  return call<AdminMember>("POST", `/api/admin/communities/${communityId}/members`, input);
}

export function seedMembers(communityId: string, count = 5): Promise<AdminMember[]> {
  return call<AdminMember[]>(
    "POST",
    `/api/admin/communities/${communityId}/members/seed`,
    { count },
  );
}

export function deleteMember(communityId: string, userId: string): Promise<{ ok: true }> {
  return call<{ ok: true }>(
    "DELETE",
    `/api/admin/communities/${communityId}/members/${userId}`,
  );
}

// --- Users ----------------------------------------------------------------
export function listUsers(q = ""): Promise<AdminUserRow[]> {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return call<AdminUserRow[]>("GET", `/api/admin/users${qs}`);
}

export function getUser(id: string): Promise<AdminUserDetail> {
  return call<AdminUserDetail>("GET", `/api/admin/users/${id}`);
}

export function updateUser(
  id: string,
  patch: {
    name?: string | null;
    role?: string | null;
    company?: string | null;
    bio?: string | null;
    linkedinUrl?: string | null;
    clearLinkedin?: boolean;
  },
): Promise<{ ok: true }> {
  return call<{ ok: true }>("PATCH", `/api/admin/users/${id}`, patch);
}
