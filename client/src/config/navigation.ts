// navigation.ts — Single source of truth for sidebar navigation
// All sidebar links, icons, and routes are defined here.
// The Sidebar component maps over this config — never hardcode links inside it.

import {
  LayoutDashboard,
  Megaphone,
  Users,
  Brain,
  PenSquare,
  CalendarDays,
  Wand2,
  FolderOpen,
  BarChart3,
  TrendingUp,
  LineChart,
  FileBarChart,
  Settings,
  Link2,
  Building2,
  CreditCard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavSubItem {
  labelKey: string;
  path: string;
  icon: LucideIcon;
}

export interface NavItem {
  labelKey: string;
  path: string;          // parent path — used for active-state matching
  icon: LucideIcon;
  iconAnimation?: string;
  subItems?: NavSubItem[];
}

export interface NavSection {
  groupKey?: string;     // optional section label (hidden in minimalist mode)
  items: NavItem[];
}

// ─── Main navigation (rendered in order) ─────────────────────────────────────

export const navSections: NavSection[] = [
  {
    items: [
      {
        labelKey: "nav.dashboard",
        path: "/dashboard",
        icon: LayoutDashboard,
        iconAnimation: "icon-pulse",
      },
    ],
  },
  {
    items: [
      {
        labelKey: "nav.ads",
        path: "/ads",
        icon: Megaphone,
        subItems: [
          { labelKey: "nav.campaigns",    path: "/ads/campaigns",    icon: Megaphone },
          { labelKey: "nav.audience",     path: "/ads/audiences",    icon: Users },
          { labelKey: "nav.adsAnalyzer",  path: "/ads/ai-analyzer",  icon: Brain },
        ],
      },
      {
        labelKey: "nav.content",
        path: "/content",
        icon: PenSquare,
        subItems: [
          { labelKey: "nav.calendar",   path: "/content/planner",    icon: CalendarDays },
          { labelKey: "nav.aiStudio",   path: "/content/ai-studio",  icon: Wand2 },
          { labelKey: "nav.assets",     path: "/content/assets",     icon: FolderOpen },
        ],
      },
      {
        labelKey: "nav.analytics",
        path: "/analytics",
        icon: BarChart3,
        subItems: [
          { labelKey: "nav.overview",      path: "/analytics/overview",      icon: BarChart3 },
          { labelKey: "nav.paidOrganic",   path: "/analytics/paid-organic",  icon: TrendingUp },
          { labelKey: "nav.competitors",   path: "/analytics/competitors",   icon: LineChart },
          { labelKey: "nav.reports",       path: "/analytics/reports",       icon: FileBarChart },
        ],
      },
    ],
  },
];

// ─── Settings — pinned at bottom, collapsible with sub-items ─────────────────

export const settingsNavItem: NavItem = {
  labelKey: "nav.settings",
  path: "/settings",
  icon: Settings,
  subItems: [
    { labelKey: "nav.integrations",  path: "/settings/integrations", icon: Link2 },
    { labelKey: "nav.workspace",     path: "/settings/workspace",    icon: Building2 },
    { labelKey: "nav.billing",       path: "/settings/billing",      icon: CreditCard },
  ],
};
