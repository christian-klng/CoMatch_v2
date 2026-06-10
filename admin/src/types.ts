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
