// A /join/<code> deep link must survive the register/login round-trip (the
// magic-link mail is opened on the same device, but in a fresh navigation),
// so the code is parked in localStorage until an authenticated screen can
// consume it.
const KEY = "comatch.pendingJoin";

export function setPendingJoinCode(code: string): void {
  localStorage.setItem(KEY, code);
}

/** Read & clear the pending code (one-shot). */
export function consumePendingJoinCode(): string | null {
  const code = localStorage.getItem(KEY);
  if (code) localStorage.removeItem(KEY);
  return code;
}

export function hasPendingJoinCode(): boolean {
  return localStorage.getItem(KEY) != null;
}
