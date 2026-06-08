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
