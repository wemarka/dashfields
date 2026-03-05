// server/routers.ts
// Main tRPC app router — assembles all sub-routers.
// Each feature lives in its own file under server/routers/
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

// ─── Feature Routers ──────────────────────────────────────────────────────────
import { campaignsRouter }    from "./app/routers/campaigns";
import { postsRouter }        from "./app/routers/posts";
import { socialRouter }       from "./app/routers/social";
import { settingsRouter }     from "./app/routers/settings";
import { notificationsRouter } from "./app/routers/notifications";
import { aiRouter }           from "./app/routers/ai";
import { alertsRouter }       from "./app/routers/alerts";
import { metaRouter }         from "./app/routers/meta";
import { schedulerRouter }    from "./app/routers/scheduler";
import { platformsRouter }    from "./app/routers/platforms";
import { exportRouter }       from "./app/routers/export";
import { reportsRouter }      from "./app/routers/reports";
import { audienceRouter }     from "./app/routers/audience";
import { budgetRouter }       from "./app/routers/budget";
import { cronRouter }         from "./app/routers/cron";
import { postAnalyticsRouter } from "./app/routers/postAnalytics";
import { periodComparisonRouter } from "./app/routers/periodComparison";
import { aiContentRouter }    from "./app/routers/aiContent";
import { apiKeysRouter }      from "./app/routers/apiKeys";
import { hashtagsRouter }     from "./app/routers/hashtags";
import { competitorsRouter }  from "./app/routers/competitors";
import { abTestingRouter }         from "./app/routers/abTesting";
import { customDashboardsRouter }  from "./app/routers/customDashboards";
import { workspacesRouter }        from "./app/routers/workspaces";
import { invitationsRouter }       from "./app/routers/invitations";
import { smartRecommendationsRouter } from "./app/routers/smartRecommendations";
import { sentimentRouter }            from "./app/routers/sentiment";
import { adsAnalyzerRouter }          from "./app/routers/adsAnalyzer";
import { savedAudiencesRouter }       from "./app/routers/savedAudiences";
import { performanceGoalsRouter }     from "./app/routers/performanceGoals";
import { contentTemplatesRouter }     from "./app/routers/contentTemplates";

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    // Logout is handled client-side via supabase.auth.signOut().
    // This stub exists for backward compatibility.
    logout: publicProcedure.mutation(() => {
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
  abTesting:        abTestingRouter,
  customDashboards: customDashboardsRouter,
  workspaces:       workspacesRouter,
  invitations:      invitationsRouter,
  smartRecommendations: smartRecommendationsRouter,
  sentiment:            sentimentRouter,
  adsAnalyzer:          adsAnalyzerRouter,
  savedAudiences:       savedAudiencesRouter,
  performanceGoals:     performanceGoalsRouter,
  contentTemplates:     contentTemplatesRouter,
});

export type AppRouter = typeof appRouter;
