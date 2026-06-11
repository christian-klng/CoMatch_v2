import { useSyncExternalStore } from "react";
import i18n from "../i18n";
import type { AuthUser } from "./types";
import {
  apiMe,
  apiRequestMagicLink,
  apiVerifyMagicLink,
  clearToken,
  getToken,
  setToken,
} from "./api";
import { refreshCommunities, resetCommunities } from "./community";
import { refreshSkillsStatus, resetSkillsStatus } from "./skills";
import { resetMatches } from "./matchStore";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
}

let state: AuthState = { status: "loading", user: null };
const listeners = new Set<() => void>();

function set(next: AuthState) {
  state = next;
  // A language explicitly chosen by the user (stored server-side) wins over
  // the device's detected language — e.g. on a fresh browser after login.
  const locale = next.user?.locale;
  if (locale && !i18n.language?.startsWith(locale)) {
    void i18n.changeLanguage(locale);
  }
  listeners.forEach((l) => l());
}

// On first use, validate any stored token by fetching the current user.
let hydrated = false;
function hydrate() {
  if (hydrated) return;
  hydrated = true;
  if (!getToken()) {
    set({ status: "anonymous", user: null });
    return;
  }
  apiMe()
    .then((user) => set({ status: "authenticated", user }))
    .catch(() => {
      clearToken();
      set({ status: "anonymous", user: null });
    });
}

/** Request a magic-link email. Resolves once the request is accepted. */
export function requestMagicLink(email: string): Promise<void> {
  return apiRequestMagicLink(email).then(() => undefined);
}

/** Consume a magic-link token, store the session, and mark the user logged in. */
export async function verifyMagicLink(token: string): Promise<void> {
  const { token: jwt, user } = await apiVerifyMagicLink(token);
  setToken(jwt);
  set({ status: "authenticated", user });
  // Await so the gates have fresh state before the post-login redirect —
  // otherwise they can bounce a returning user to /scan or /skills.
  await Promise.all([refreshCommunities(), refreshSkillsStatus()]);
}

/** Re-fetch the current user (e.g. after a profile change). */
export function refreshUser(): void {
  if (!getToken()) return;
  apiMe()
    .then((user) => set({ status: "authenticated", user }))
    .catch(() => {});
}

export function logout(): void {
  clearToken();
  resetCommunities();
  resetSkillsStatus();
  resetMatches();
  set({ status: "anonymous", user: null });
}

function subscribe(cb: () => void) {
  hydrate();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, () => state);
}
