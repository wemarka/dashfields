/**
 * server/routers.ts
 * Main tRPC app router — assembles all sub-routers.
 * Each feature lives in its own file under server/routers/
 */
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

// ─── Feature Routers ──────────────────────────────────────────────────────────
import { campaignsRouter }    from "./routers/campaigns";
import { postsRouter }        from "./routers/posts";
import { socialRouter }       from "./routers/social";
import { settingsRouter }     from "./routers/settings";
import { notificationsRouter } from "./routers/notifications";
import { aiRouter }           from "./routers/ai";
import { alertsRouter }       from "./routers/alerts";
import { metaRouter }         from "./routers/meta";
import { schedulerRouter }    from "./routers/scheduler";
import { platformsRouter }    from "./routers/platforms";
import { exportRouter }       from "./routers/export";
import { reportsRouter }      from "./routers/reports";
import { audienceRouter }     from "./routers/audience";
import { budgetRouter }       from "./routers/budget";
import { cronRouter }         from "./routers/cron";
import { postAnalyticsRouter } from "./routers/postAnalytics";
import { periodComparisonRouter } from "./routers/periodComparison";
import { aiContentRouter }    from "./routers/aiContent";
import { apiKeysRouter }      from "./routers/apiKeys";
import { hashtagsRouter }     from "./routers/hashtags";
import { competitorsRouter }  from "./routers/competitors";

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  campaigns:     campaignsRouter,
  posts:         postsRouter,
  social:        socialRouter,
  settings:      settingsRouter,
  notifications: notificationsRouter,
  ai:            aiRouter,
  alerts:        alertsRouter,
  meta:          metaRouter,
  scheduler:     schedulerRouter,
  platforms:     platformsRouter,
  export:        exportRouter,
  reports:       reportsRouter,
  audience:      audienceRouter,
  budget:        budgetRouter,
  cron:          cronRouter,
  postAnalytics: postAnalyticsRouter,
  periodComparison: periodComparisonRouter,
  aiContent:     aiContentRouter,
  apiKeys:       apiKeysRouter,
  hashtags:      hashtagsRouter,
  competitors:   competitorsRouter,
});

export type AppRouter = typeof appRouter;
