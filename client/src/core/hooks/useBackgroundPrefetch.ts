/**
 * client/src/core/hooks/useBackgroundPrefetch.ts
 *
 * Background prefetch hook — warms the React Query cache for the most
 * frequently visited pages after the Dashboard finishes loading.
 *
 * Strategy:
 *  - Fires 2 seconds after Dashboard mounts (user is reading the page)
 *  - Prefetches: Campaigns, Analytics Overview, Audiences
 *  - Only runs once per session (tracked via sessionStorage flag)
 *  - Silently ignores errors — non-critical optimization
 *
 * Usage (in Dashboard/Home.tsx):
 *   useBackgroundPrefetch();
 */

import { useEffect } from "react";
import { trpc } from "@/core/lib/trpc";
import { QUERY_STALE_TIME } from "@/core/lib/queryConfig";

const SESSION_FLAG = "dashfields_bg_prefetch_done";
const DELAY_MS = 2000; // 2 seconds after mount

export function useBackgroundPrefetch() {
  const utils = trpc.useUtils();

  useEffect(() => {
    // Only run once per browser session
    if (sessionStorage.getItem(SESSION_FLAG)) return;

    const timer = setTimeout(async () => {
      sessionStorage.setItem(SESSION_FLAG, "1");

      // Prefetch in parallel — all non-critical
      const tasks = [
        // Campaigns list
        utils.meta.campaigns.prefetch(
          {},
          { staleTime: QUERY_STALE_TIME.CAMPAIGNS }
        ).catch(() => null),

        // Analytics overview
        utils.meta.accountInsights.prefetch(
          { datePreset: "last_30d" },
          { staleTime: QUERY_STALE_TIME.ANALYTICS }
        ).catch(() => null),

        // Analytics comparison
        utils.meta.compareInsights.prefetch(
          { datePreset: "last_30d" },
          { staleTime: QUERY_STALE_TIME.ANALYTICS }
        ).catch(() => null),

        // Alerts list (small, fast)
        utils.alerts.list.prefetch(
          undefined,
          { staleTime: QUERY_STALE_TIME.STATIC }
        ).catch(() => null),

        // Reports list (small, fast)
        utils.reports.list.prefetch(
          undefined,
          { staleTime: QUERY_STALE_TIME.STATIC }
        ).catch(() => null),
      ];

      await Promise.allSettled(tasks);
    }, DELAY_MS);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount
}
