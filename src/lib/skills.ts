import { useSyncExternalStore } from "react";
import { apiGetMySkills, getToken } from "./api";

// Tracks whether the logged-in user has picked any skills yet. The router uses
// this to resume an interrupted onboarding: community joined but no skills
// saved → back to /skills instead of an empty matches list.
export type SkillsStatus = "loading" | "ready" | "error";

interface SkillsState {
  status: SkillsStatus;
  hasSkills: boolean;
}

let state: SkillsState = { status: "loading", hasSkills: false };
const listeners = new Set<() => void>();

function set(next: SkillsState) {
  state = next;
  listeners.forEach((l) => l());
}

function load(): Promise<void> {
  if (!getToken()) {
    set({ status: "ready", hasSkills: false });
    return Promise.resolve();
  }
  return apiGetMySkills()
    .then(({ seeks, offers }) =>
      set({ status: "ready", hasSkills: seeks.length + offers.length > 0 }),
    )
    .catch(() => set({ status: "error", hasSkills: false }));
}

let hydrated = false;
function hydrate() {
  if (hydrated) return;
  hydrated = true;
  void load();
}

/** Re-fetch the skills status — call after saving skills or after login.
 *  Await it before navigating into a skills-gated route, or the gate sees
 *  stale state. */
export function refreshSkillsStatus(): Promise<void> {
  return load();
}

/** Drop the cached status — call on logout so the next user starts clean. */
export function resetSkillsStatus(): void {
  hydrated = false;
  set({ status: "loading", hasSkills: false });
}

function subscribe(cb: () => void) {
  hydrate();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useMySkillsStatus(): SkillsState {
  return useSyncExternalStore(subscribe, () => state);
}
