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
  linkedinUrl?: string | null;
  /** Whether the LinkedIn profile behind linkedinUrl was successfully read. */
  linkedinProfileRead?: boolean;
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
  /** 8-digit join code, used for both QR scan and manual entry. */
  code: string;
  memberCount: number;
  /** e.g. an event or org context */
  context?: string;
}

/** Admin view of a community — adds the publish gate and creation time. */
export interface AdminCommunity extends Community {
  published: boolean;
  createdAt: string;
}

/** Hybrid matching: suggestions are visible, a connection is requested/confirmed. */
export type ConnectionStatus = "none" | "requested" | "incoming" | "connected";

export interface Person {
  id: string;
  name: string;
  /** Null until the user fills their profile (e.g. magic-link signup). */
  role: string | null;
  company?: string;
  avatarUrl: string | null;
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
