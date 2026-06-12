// Temporary feature switches for test phases — flip back to `true` to restore.
// Keep in sync with the API counterpart: api/src/featureFlags.ts (the
// name/photo masking happens server-side, so both flags must match).
//
// CONNECTION_GATING bundles the request/accept flow and the identity masking
// that depends on it (blurred avatars/names, connect buttons, status badges,
// the incoming-requests banner).
export const CONNECTION_GATING: boolean = false;

// Cap for the matches list during the test phase — only the top N matches
// are rendered (and counted in the header badge).
export const MAX_VISIBLE_MATCHES = 4;
