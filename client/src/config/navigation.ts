// navigation.ts — Single source of truth for sidebar navigation
// All sidebar links, icons, and routes are defined here.
// The Sidebar component maps over this config — never hardcode links inside it.

import {
  Sparkles,
  Settings,
  Link2,
  Building2,
  CreditCard,
  LayoutGrid,
  Wand2,
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
  /** If set, clicking opens a dialog instead of navigating */
  openDialog?: string;
}

export interface NavSection {
  groupKey?: string;     // optional section label (hidden in minimalist mode)
  label?: string;        // i18n key for Lovable-style section header
  items: NavItem[];
}

// ─── Main navigation (rendered in order) ─────────────────────────────────────

export const navSections: NavSection[] = [
  {
    items: [
      {
        labelKey: "nav.campaignWizard",
        path: "/campaign-wizard",
        icon: Wand2,
        iconAnimation: "icon-pulse",
      },
      {
        labelKey: "nav.aiAgent",
        path: "/dashboard",
        icon: Sparkles,
        iconAnimation: "icon-pulse",
      },
      {
        labelKey: "nav.marketingTools",
        path: "/marketing-tools",
        icon: LayoutGrid,
        openDialog: "marketingTools",
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
