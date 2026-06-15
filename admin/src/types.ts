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
}

export interface AdminUserDetail extends Omit<AdminUserRow, "hasSkillSuggestions"> {
  bio: string | null;
  linkedinConsentAt: string | null;
  /** Stored AI suggestions (skill IDs). null = no LinkedIn import done. */
  skillSuggestions: { seeks: string[]; offers: string[] } | null;
  locale: string | null;
  skills: { kind: "seek" | "offer"; label: string; id: string }[];
  communities: { id: string; name: string }[];
}
