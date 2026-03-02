import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";

// ─── Campaigns Router ─────────────────────────────────────────────────────────
const campaignsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserCampaigns(ctx.user.id);
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      platform: z.enum(["facebook", "instagram", "linkedin", "twitter", "youtube", "tiktok", "google"]),
      budget: z.number().optional(),
      objective: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.createCampaign({ userId: ctx.user.id, ...input });
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      status: z.enum(["active", "paused", "ended", "draft", "scheduled"]),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.updateCampaignStatus(input.campaignId, ctx.user.id, input.status);
    }),

  metrics: protectedProcedure
    .input(z.object({ campaignId: z.number(), days: z.number().default(7) }))
    .query(async ({ input }) => {
      return db.getCampaignMetrics(input.campaignId, input.days);
    }),
});

// ─── Posts Router ─────────────────────────────────────────────────────────────
const postsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserPosts(ctx.user.id);
  }),

  create: protectedProcedure
    .input(z.object({
      content: z.string().min(1),
      title: z.string().optional(),
      platforms: z.array(z.string()).min(1),
      scheduledAt: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.createPost({ userId: ctx.user.id, ...input });
    }),
});

// ─── Social Accounts Router ───────────────────────────────────────────────────
const socialRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserSocialAccounts(ctx.user.id);
  }),
});

// ─── Settings Router ──────────────────────────────────────────────────────────
const settingsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserSettings(ctx.user.id);
  }),

  update: protectedProcedure
    .input(z.object({
      defaultTimezone: z.string().optional(),
      notificationsEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.upsertUserSettings(ctx.user.id, input);
    }),
});

// ─── Notifications Router ─────────────────────────────────────────────────────
const notificationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserNotifications(ctx.user.id);
  }),

  markRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return db.markNotificationRead(input.notificationId, ctx.user.id);
    }),
});

// ─── AI Router ────────────────────────────────────────────────────────────────
const aiRouter = router({
  generate: protectedProcedure
    .input(z.object({
      prompt: z.string().min(1),
      tool: z.enum(["copy", "audience", "creative", "strategy"]),
    }))
    .mutation(async ({ input }) => {
      const systemPrompts: Record<string, string> = {
        copy:     "You are an expert Meta Ads copywriter. Generate compelling, conversion-focused ad copy. Be concise and impactful.",
        audience: "You are a Meta Ads audience targeting expert. Help define precise audience segments with demographics, interests, and behaviors.",
        creative: "You are a creative director for digital advertising. Write detailed creative briefs for ad campaigns.",
        strategy: "You are a senior digital marketing strategist specializing in Meta Ads. Provide data-driven campaign strategies.",
      };

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompts[input.tool] ?? systemPrompts.copy },
          { role: "user", content: input.prompt },
        ],
      });

      const content = response?.choices?.[0]?.message?.content ?? "Unable to generate content. Please try again.";
      return { content };
    }),
});

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
  campaigns: campaignsRouter,
  posts: postsRouter,
  social: socialRouter,
  settings: settingsRouter,
  notifications: notificationsRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
