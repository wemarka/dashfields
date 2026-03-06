/**
 * connections/components/types.ts — Shared types for connection components.
 */
export interface ConnectedAccount {
  id: number;
  platform: string;
  name?: string | null;
  username?: string | null;
  platformAccountId: string;
  isActive: boolean;
  profilePicture?: string | null;
  userProfilePicture?: string | null;
  accountType?: string | null;
  tokenExpiresAt?: string | null;
  updatedAt?: string | null;
}
