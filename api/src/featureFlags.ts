// Temporary feature switches for test phases — flip back to `true` to restore.
// Keep in sync with the frontend counterpart: src/lib/featureFlags.ts.
//
// CONNECTION_GATING bundles the request/accept flow and the identity masking
// that depends on it: while off, matches expose real names/photos to everyone
// in the pool and the client hides all connect UI.
export const CONNECTION_GATING: boolean = false;
