/**
 * useKeyboardShortcuts.ts
 * Global keyboard shortcut registry for DashFields.
 * Usage: call useKeyboardShortcuts() once at the app root (or DashboardLayout).
 */
import { useEffect } from "react";
import { useLocation } from "wouter";

export type ShortcutDef = {
  key: string;           // e.g. "n", "k", "/"
  ctrl?: boolean;        // Ctrl/Cmd
  shift?: boolean;
  alt?: boolean;
  description: string;
  group: string;
  action: () => void;
};

// ─── Shortcut Registry ────────────────────────────────────────────────────────
// Exported so ShortcutsModal can display them
export const SHORTCUT_DEFS: Omit<ShortcutDef, "action">[] = [
  { key: "n",   ctrl: false, description: "New Post",                group: "Publishing" },
  { key: "k",   ctrl: true,  description: "Open Search",             group: "Navigation" },
  { key: "/",   ctrl: false, description: "Focus Search",            group: "Navigation" },
  { key: "g d", ctrl: false, description: "Go to Dashboard",         group: "Navigation" },
  { key: "g c", ctrl: false, description: "Go to Campaigns",         group: "Navigation" },
  { key: "g a", ctrl: false, description: "Go to Analytics",         group: "Navigation" },
  { key: "g l", ctrl: false, description: "Go to Calendar",          group: "Navigation" },
  { key: "g s", ctrl: false, description: "Go to AI Studio",         group: "Navigation" },
  { key: "g r", ctrl: false, description: "Go to Reports",           group: "Navigation" },
  { key: "?",   ctrl: false, description: "Show Keyboard Shortcuts", group: "Help" },
  { key: "Escape", ctrl: false, description: "Close Modal / Dismiss", group: "General" },
];

export function useKeyboardShortcuts(callbacks: {
  onNewPost?: () => void;
  onOpenSearch?: () => void;
  onShowShortcuts?: () => void;
}) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    let gBuffer = "";
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditable = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" ||
        (e.target as HTMLElement)?.isContentEditable;

      // Allow Escape and Ctrl+K even in inputs
      const isGlobal = e.key === "Escape" || (e.ctrlKey && e.key === "k");
      if (isEditable && !isGlobal) return;

      // ── Ctrl+K: open search ──
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        callbacks.onOpenSearch?.();
        return;
      }

      // ── ? : show shortcuts ──
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        callbacks.onShowShortcuts?.();
        return;
      }

      // ── n : new post ──
      if (e.key === "n" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        callbacks.onNewPost?.();
        return;
      }

      // ── g + key : navigation ──
      if (e.key === "g" && !e.ctrlKey && !e.metaKey) {
        gBuffer = "g";
        if (gTimer) clearTimeout(gTimer);
        gTimer = setTimeout(() => { gBuffer = ""; }, 1000);
        return;
      }
      if (gBuffer === "g") {
        gBuffer = "";
        if (gTimer) clearTimeout(gTimer);
        switch (e.key) {
          case "d": setLocation("/dashboard"); break;
          case "c": setLocation("/campaigns"); break;
          case "a": setLocation("/analytics"); break;
          case "l": setLocation("/calendar");  break;
          case "s": setLocation("/ai-content"); break;
          case "r": setLocation("/reports");   break;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [callbacks, setLocation]);
}
