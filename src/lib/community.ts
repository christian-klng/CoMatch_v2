import { useSyncExternalStore } from "react";
import type { Community } from "./types";
import { apiMyCommunities, getToken } from "./api";

export type CommunityStatus = "loading" | "ready" | "error";

interface CommunityState {
  status: CommunityStatus;
  communities: Community[];
}

let state: CommunityState = { status: "loading", communities: [] };
const listeners = new Set<() => void>();

function set(next: CommunityState) {
  state = next;
  listeners.forEach((l) => l());
}

function load(): Promise<void> {
  if (!getToken()) {
    set({ status: "ready", communities: [] });
    return Promise.resolve();
  }
  return apiMyCommunities()
    .then((communities) => set({ status: "ready", communities }))
    .catch(() => set({ status: "error", communities: [] }));
}

let hydrated = false;
function hydrate() {
  if (hydrated) return;
  hydrated = true;
  void load();
}

/** Re-fetch memberships — call after joining a community. Await it before
 *  navigating into a community-gated route, or the gate sees stale state. */
export function refreshCommunities(): Promise<void> {
  return load();
}

/** Drop cached memberships — call on logout so the next user starts clean. */
export function resetCommunities(): void {
  hydrated = false;
  set({ status: "loading", communities: [] });
}

function subscribe(cb: () => void) {
  hydrate();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useMyCommunities(): CommunityState {
  return useSyncExternalStore(subscribe, () => state);
}
