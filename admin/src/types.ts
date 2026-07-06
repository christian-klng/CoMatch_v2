export interface AdminSession {
  id: string;
  email: string;
}

export interface AdminCommunity {
  id: string;
  name: string;
  /** 8-digit join code (QR + manual entry). */
  code: string;
  context?: string | null;
  memberCount: number;
  published: boolean;
  createdAt: string;
}

export interface AdminMember {
  id: string;
  name: string;
  email?: string | null;
  role: string;
  company?: string | null;
  joinedAt: string;
  /** How many communities this user belongs to (delete removes them everywhere). */
  communityCount: number;
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  company: string | null;
  linkedinUrl: string | null;
  linkedinProfileRead: boolean;
  avatarUrl: string | null;
  hasAvatarData: boolean;
  hasSkillSuggestions: boolean;
  createdAt: string;
  communityCount: number;
  /** How many documents the user uploaded about their startup (max 5). */
  fileCount: number;
}

/** A file the user uploaded about themselves (CV, pitch deck, …). */
export interface AdminUserFile {
  id: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  createdAt: string;
}

export interface AdminUserDetail extends Omit<AdminUserRow, "hasSkillSuggestions" | "fileCount"> {
  bio: string | null;
  /** Profile tags (max 3) — prefilled from LinkedIn, editable, backfillable. */
  attributes: string[];
  /** The user's own website URL (reading the site comes later). */
  websiteUrl: string | null;
  /** Preferred contact channel ('linkedin' only when a LinkedIn URL is set). */
  contactChannel: "email" | "linkedin";
  /** Free-text "about us" note used when others reach out. */
  contactNote: string | null;
  linkedinConsentAt: string | null;
  /** Stored AI suggestions (skill IDs). null = no LinkedIn import done. */
  skillSuggestions: { seeks: string[]; offers: string[] } | null;
  locale: string | null;
  skills: { kind: "seek" | "offer"; label: string; id: string }[];
  communities: { id: string; name: string }[];
  files: AdminUserFile[];
}
