/**
 * client/src/core/hooks/usePrefetch.ts
 *
 * React hook for hover-based route prefetching.
 * Attach the returned handlers to any navigation element to pre-warm
 * the React Query cache before the user navigates.
 *
 * Features:
 *  - 120ms debounce to avoid firing on quick mouse movements
 *  - Only prefetches if data is stale (won't re-fetch fresh data)
 *  - Cancels pending prefetch on mouse leave
 *
 * Usage:
 *   const { onMouseEnter, onMouseLeave } = usePrefetch("/ads/campaigns");
 *   <NavLink onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} href="/ads/campaigns" />
 */

import { useCallback, useRef } from "react";
import { trpc } from "@/core/lib/trpc";
import { getPrefetcherForRoute } from "@/core/lib/prefetch";

const DEBOUNCE_MS = 120;

/**
 * Returns mouse event handlers that trigger data prefetching for a route.
 * @param route - The target route path (e.g., "/ads/campaigns")
 */
export function usePrefetch(route: string) {
  const utils = trpc.useUtils();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMouseEnter = useCallback(() => {
    const prefetcher = getPrefetcherForRoute(route);
    if (!prefetcher) return;

    // Debounce: only prefetch after hovering for 120ms
    timerRef.current = setTimeout(() => {
      try {
        prefetcher(utils);
      } catch {
        // Silently ignore prefetch errors — they're non-critical
      }
    }, DEBOUNCE_MS);
  }, [route, utils]);

  const onMouseLeave = useCallback(() => {
    // Cancel pending prefetch if user moved away quickly
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return { onMouseEnter, onMouseLeave };
}

/**
 * Returns a single prefetch trigger function (for programmatic use).
 * Useful for prefetching on focus or other non-hover events.
 * @param route - The target route path
 */
export function usePrefetchTrigger(route: string) {
  const utils = trpc.useUtils();

  return useCallback(() => {
    const prefetcher = getPrefetcherForRoute(route);
    if (!prefetcher) return;
    try {
      prefetcher(utils);
    } catch {
      // Silently ignore
    }
  }, [route, utils]);
}
