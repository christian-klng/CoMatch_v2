// Domain types for CoMatch v0.1 (dummy stage).
// Intentionally close to a future Postgres schema so the move from
// mock data -> real API is mechanical, not a rewrite.

/** The authenticated user (subset of the DB user row returned by /api/auth). */
export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  company?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  attributes: string[];
}

export type SkillKind = "seek" | "offer"; // "ich suche" | "ich kann

export interface Skill {
  id: string;
  label: string;
  kind: SkillKind;
}

export interface Community {
  id: string;
  name: string;
  /** What the QR code encodes. In prod: signed + expiring, not a raw id. */
  joinCode: string;
  memberCount: number;
  /** e.g. an event or org context */
  context?: string;
}

/** Hybrid matching: suggestions are visible, a connection is requested/confirmed. */
export type ConnectionStatus = "none" | "requested" | "incoming" | "connected";

export interface Person {
  id: string;
  name: string;
  role: string;
  company?: string;
  avatarUrl: string;
  bio?: string;
  /** Attributes / tags shown on the card (gap: keep controlled, not free text). */
  attributes: string[];
  seeks: string[];
  offers: string[];
  /** 0..100 — computed server-side later (seek<->offer overlap, embeddings). */
  matchScore: number;
  /** Which of my needs / offers this person addresses — drives the "why matched". */
  matchedOn: { theyOffer: string[]; theySeek: string[] };
  connection: ConnectionStatus;
}
