import { useSyncExternalStore } from "react";
import type { ConnectionStatus, Person } from "./types";
import { apiAcceptConnection, apiRequestConnection, fetchMatches } from "./api";

// Minimal observable store (no dependency). Loads matches from the API and
// serves them to components; refreshable because the pool changes (new
// community, changed skills) and resettable on logout.
export type LoadStatus = "loading" | "ready" | "error";

let state: Person[] = [];
let status: LoadStatus = "loading";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

// Deduped: subscribe (first mount) and refreshMatches (visit effect) can fire
// in the same tick — share one request instead of racing two.
let inflight: Promise<void> | null = null;
function load(): Promise<void> {
  if (inflight) return inflight;
  inflight = fetchMatches()
    .then((data) => {
      state = data;
      status = "ready";
      emit();
    })
    .catch((err) => {
      console.error("[matches] load failed", err);
      // A failed background refresh (polling) must not replace an already
      // visible list with the error screen — only error out when there is
      // nothing to show yet.
      if (state.length === 0) status = "error";
      emit();
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

let started = false;
function ensureLoaded() {
  if (started) return;
  started = true;
  void load();
}

/** Re-fetch matches — call when entering the matches screen so a grown pool
 *  (new community, changed skills) shows up. Current data stays visible while
 *  the fresh list loads (stale-while-revalidate). */
export function refreshMatches(): Promise<void> {
  started = true;
  return load();
}

/** Drop cached matches — call on logout so the next user starts clean. */
export function resetMatches(): void {
  started = false;
  state = [];
  status = "loading";
  emit();
}

function mutate(id: string, next: ConnectionStatus) {
  state = state.map((p) => (p.id === id ? { ...p, connection: next } : p));
  emit();
}

/** Request a connection. Optimistic update, rolled back if the API fails. */
export async function requestConnection(id: string): Promise<void> {
  const prev = state.find((p) => p.id === id)?.connection ?? "none";
  mutate(id, "requested");
  try {
    // Server may answer "connected" (the other side had already asked us).
    const { status: result } = await apiRequestConnection(id);
    mutate(id, result);
  } catch (err) {
    console.error("[connections] request failed", err);
    mutate(id, prev);
  }
}

/** Accept an incoming request. Optimistic update, rolled back if the API fails. */
export async function acceptConnection(id: string): Promise<void> {
  const prev = state.find((p) => p.id === id)?.connection ?? "incoming";
  mutate(id, "connected");
  try {
    await apiAcceptConnection(id);
  } catch (err) {
    console.error("[connections] accept failed", err);
    mutate(id, prev);
  }
}

function subscribe(cb: () => void) {
  ensureLoaded();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useMatches(): Person[] {
  return useSyncExternalStore(subscribe, () => state);
}

export function useMatchesStatus(): LoadStatus {
  return useSyncExternalStore(subscribe, () => status);
}

export function useMatch(id: string | undefined): Person | undefined {
  const matches = useMatches();
  return matches.find((p) => p.id === id);
}
