/**
 * team/components/constants.ts — Shared role config and types.
 */
import { Crown, Shield, UserCheck, Eye } from "lucide-react";

export const ROLE_CONFIG = {
  owner: {
    label: "Owner",
    icon: Crown,
    color: "text-brand",
    bg: "bg-brand/10",
    border: "border-brand/20",
    description: "Full access, cannot be removed",
  },
  admin: {
    label: "Admin",
    icon: Shield,
    color: "text-foreground",
    bg: "bg-muted",
    border: "border-border",
    description: "Can manage members, settings, and all content",
  },
  member: {
    label: "Member",
    icon: UserCheck,
    color: "text-muted-foreground",
    bg: "bg-muted/60",
    border: "border-border",
    description: "Can create and manage content",
  },
  viewer: {
    label: "Viewer",
    icon: Eye,
    color: "text-muted-foreground",
    bg: "bg-muted/40",
    border: "border-border",
    description: "Read-only access to analytics and reports",
  },
} as const;

export type Role = keyof typeof ROLE_CONFIG;

export interface MemberData {
  id: number;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  joined_at: string | null;
}
