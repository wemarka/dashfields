/**
 * client/src/core/lib/prefetch.ts
 *
 * Prefetch utilities for route-based data loading.
 * Called on hover over sidebar links to pre-warm the React Query cache
 * before the user actually navigates to a page.
 *
 * Strategy:
 *  - Each route has a `prefetchRoute()` function that calls trpc utils.prefetch
 *  - Prefetch is debounced (100ms) to avoid firing on quick mouse movements
 *  - Data is stored in React Query cache with the same keys as the real queries
 *
 * Usage:
 *   import { getPrefetcherForRoute } from "@/core/lib/prefetch";
 *   const prefetch = getPrefetcherForRoute("/ads/campaigns");
 *   <NavLink onMouseEnter={prefetch} href="/ads/campaigns" />
 */

import { trpc } from "@/core/lib/trpc";
import { QUERY_STALE_TIME } from "@/core/lib/queryConfig";

// ─── Types ────────────────────────────────────────────────────────────────────

type PrefetchFn = (utils: ReturnType<typeof trpc.useUtils>) => void;

// ─── Route → Prefetch map ─────────────────────────────────────────────────────

const ROUTE_PREFETCHERS: Record<string, PrefetchFn> = {
  "/dashboard": (utils) => {
    utils.meta.accountInsights.prefetch(
      { datePreset: "last_30d" },
      { staleTime: QUERY_STALE_TIME.DASHBOARD }
    );
  },

  "/ads/campaigns": (utils) => {
    utils.meta.campaigns.prefetch(
      {},
      { staleTime: QUERY_STALE_TIME.CAMPAIGNS }
    );
  },

  "/analytics/overview": (utils) => {
    utils.meta.accountInsights.prefetch(
      { datePreset: "last_30d" },
      { staleTime: QUERY_STALE_TIME.ANALYTICS }
    );
    utils.meta.compareInsights.prefetch(
      { datePreset: "last_30d" },
      { staleTime: QUERY_STALE_TIME.ANALYTICS }
    );
  },

  "/ads/audiences": (utils) => {
    utils.audience.getAudienceData.prefetch(
      { datePreset: "last_30d" },
      { staleTime: QUERY_STALE_TIME.AUDIENCE }
    );
  },

  "/analytics/reports": (utils) => {
    utils.reports.list.prefetch(
      undefined,
      { staleTime: QUERY_STALE_TIME.STATIC }
    );
  },

  "/alerts": (utils) => {
    utils.alerts.list.prefetch(
      undefined,
      { staleTime: QUERY_STALE_TIME.STATIC }
    );
  },

  "/notifications": (utils) => {
    utils.notifications.list.prefetch(
      { limit: 20 },
      { staleTime: QUERY_STALE_TIME.REALTIME }
    );
  },
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a prefetch function for a given route path.
 * Returns undefined if no prefetcher is registered for that route.
 */
export function getPrefetcherForRoute(
  route: string
): PrefetchFn | undefined {
  // Normalize: strip trailing slash, match prefix
  const normalized = route.replace(/\/$/, "");
  return ROUTE_PREFETCHERS[normalized];
}

/**
 * Debounce helper — prevents firing prefetch on quick mouse movements.
 * Returns a debounced version of the given function.
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}
