/**
 * client/src/core/lib/queryConfig.ts
 *
 * Centralized React Query configuration for the Dashfields app.
 *
 * Strategy:
 *  - Global defaults: staleTime=5min, gcTime=30min (avoids re-fetching on every navigation)
 *  - Per-query overrides: use QUERY_STALE_TIME constants for specific data types
 *  - Retry: 1 retry for queries (network hiccups), 0 for mutations
 *
 * Usage in components:
 *   trpc.meta.campaigns.useQuery(input, { staleTime: QUERY_STALE_TIME.CAMPAIGNS })
 */

import { QueryClient } from "@tanstack/react-query";

// ─── Stale time constants (milliseconds) ─────────────────────────────────────

export const QUERY_STALE_TIME = {
  /** Real-time data: notifications, alerts — always fresh */
  REALTIME: 0,

  /** Dashboard KPIs — refresh every 2 minutes */
  DASHBOARD: 2 * 60 * 1000,

  /** Campaign list + insights — refresh every 5 minutes */
  CAMPAIGNS: 5 * 60 * 1000,

  /** Analytics charts — refresh every 10 minutes */
  ANALYTICS: 10 * 60 * 1000,

  /** Audience demographics — refresh every 15 minutes */
  AUDIENCE: 15 * 60 * 1000,

  /** Ad previews (iframe) — refresh every 30 minutes client-side (24h server-side) */
  AD_PREVIEWS: 30 * 60 * 1000,

  /** Static/config data: connections, settings, workspaces — refresh every 30 minutes */
  STATIC: 30 * 60 * 1000,

  /** User profile — refresh every 60 minutes */
  USER_PROFILE: 60 * 60 * 1000,
} as const;

// ─── GC time constants (milliseconds) ────────────────────────────────────────
// How long to keep inactive query data in memory before garbage collection.

export const QUERY_GC_TIME = {
  /** Short-lived: notifications, alerts */
  SHORT: 5 * 60 * 1000,

  /** Standard: most queries */
  STANDARD: 30 * 60 * 1000,

  /** Long-lived: static config, user profile */
  LONG: 60 * 60 * 1000,
} as const;

// ─── QueryClient factory ──────────────────────────────────────────────────────

/**
 * Creates a QueryClient with sensible global defaults.
 * Import this in main.tsx instead of `new QueryClient()`.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Don't re-fetch on every navigation — data is fresh for 5 minutes by default
        staleTime: QUERY_STALE_TIME.CAMPAIGNS,

        // Keep inactive data in memory for 30 minutes
        gcTime: QUERY_GC_TIME.STANDARD,

        // Retry once on failure (network hiccup), not on 4xx errors
        retry: (failureCount, error: unknown) => {
          if (failureCount >= 1) return false;
          // Don't retry on client errors (401, 403, 404)
          const status = (error as { data?: { httpStatus?: number } })?.data?.httpStatus;
          if (status && status >= 400 && status < 500) return false;
          return true;
        },

        // Don't re-fetch when window regains focus (reduces unnecessary API calls)
        refetchOnWindowFocus: false,

        // Don't re-fetch when reconnecting (let user trigger manually)
        refetchOnReconnect: "always",
      },
      mutations: {
        // No retry on mutations — they're not idempotent
        retry: 0,
      },
    },
  });
}
