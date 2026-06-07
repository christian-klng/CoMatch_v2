import { useSyncExternalStore } from "react";
import type { ConnectionStatus, Person } from "./types";
import { MOCK_MATCHES } from "./mockData";

// Minimal observable store (no dependency). Swap for the API layer later:
// the component-facing hooks stay identical.
let state: Person[] = MOCK_MATCHES;
const listeners = new Set<() => void>();

function emit() {
  state = [...state];
  listeners.forEach((l) => l());
}

export function setConnection(id: string, status: ConnectionStatus) {
  state = state.map((p) => (p.id === id ? { ...p, connection: status } : p));
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useMatches(): Person[] {
  return useSyncExternalStore(subscribe, () => state);
}

export function useMatch(id: string | undefined): Person | undefined {
  const matches = useMatches();
  return matches.find((p) => p.id === id);
}
