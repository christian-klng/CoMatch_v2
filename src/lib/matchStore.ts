import { useSyncExternalStore } from "react";
import type { ConnectionStatus, Person } from "./types";
import { fetchMatches } from "./api";

// Minimal observable store (no dependency). Loads matches from the API once,
// then serves them to components. The component-facing hooks are unchanged from
// the mock-data version — only the source moved.
export type LoadStatus = "loading" | "ready" | "error";

let state: Person[] = [];
let status: LoadStatus = "loading";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

let started = false;
function ensureLoaded() {
  if (started) return;
  started = true;
  fetchMatches()
    .then((data) => {
      state = data;
      status = "ready";
      emit();
    })
    .catch((err) => {
      console.error("[matches] load failed", err);
      status = "error";
      emit();
    });
}

export function setConnection(id: string, next: ConnectionStatus) {
  // Optimistic local update only — there is no connections endpoint yet,
  // so this is not persisted to the API. Wire up once auth + POST exist.
  state = state.map((p) => (p.id === id ? { ...p, connection: next } : p));
  emit();
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
