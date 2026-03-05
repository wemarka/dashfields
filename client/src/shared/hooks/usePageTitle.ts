import { useEffect } from "react";

/**
 * Sets the browser tab title dynamically.
 * Appends " — Dashfields" suffix automatically.
 * @param title - Page-specific title (e.g. "Campaigns", "Analytics")
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} — Dashfields` : "Dashfields";
    return () => {
      document.title = prev;
    };
  }, [title]);
}
