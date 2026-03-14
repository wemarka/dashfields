/**
 * layout-parts/helpers.ts — Shared types, hooks, and platform helpers for DashboardLayout.
 */
import { useState, useEffect } from "react";
import { Facebook, Instagram, Linkedin, Twitter, Youtube, Globe2 } from "lucide-react";

// ─── Dark Mode Hook ───────────────────────────────────────────────────────────
export function useDarkMode() {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("dashfields-theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("dashfields-theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("dashfields-theme", "light");
    }
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type SocialAccount = {
  id: number;
  platform: string;
  name: string | null;
  username: string | null;
  account_type: string | null;
  is_active: boolean | null;
  profile_picture: string | null;
};

export type NavItem = { icon: React.ElementType; labelKey: string; path: string; iconAnimation?: string };
export type NavGroup = { labelKey: string | null; items: NavItem[] };

// ─── Platform helpers ─────────────────────────────────────────────────────────
export const PLATFORM_ICONS: Record<string, React.ElementType> = {
  facebook: Facebook, instagram: Instagram, linkedin: Linkedin,
  twitter: Twitter, youtube: Youtube,
};
export const PLATFORM_COLORS: Record<string, string> = {
  facebook: "text-muted-foreground", instagram: "text-muted-foreground",
  linkedin: "text-muted-foreground", twitter: "text-muted-foreground",
  youtube: "text-brand",
};
