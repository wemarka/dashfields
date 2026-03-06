/**
 * team/components/constants.ts — Shared role config and types.
 */
import { Crown, Shield, UserCheck, Eye } from "lucide-react";

export const ROLE_CONFIG = {
  owner: {
    label: "Owner",
    icon: Crown,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    description: "Full access, cannot be removed",
  },
  admin: {
    label: "Admin",
    icon: Shield,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    description: "Can manage members, settings, and all content",
  },
  member: {
    label: "Member",
    icon: UserCheck,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    description: "Can create and manage content",
  },
  viewer: {
    label: "Viewer",
    icon: Eye,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
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
