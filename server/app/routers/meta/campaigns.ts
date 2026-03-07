/**
 * meta/campaigns.ts — Campaign management: CRUD, daily insights, breakdown, ad sets, ads, bulk ops.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../../../_core/trpc";
import { getSupabase } from "../../../supabase";
import {
  MetaCampaign,
  getMetaCampaigns,
  getCampaignInsights,
  getCampaignDailyInsights,
  getCampaignBreakdown,
  createMetaCampaign,
  updateMetaCampaignStatus,
  updateMetaCampaignBudget,
  getCampaignAdSets,
  getAdSetInsights,
  getCampaignAds,
  getAdInsights,
} from "../../../services/integrations/meta";
import { getMetaToken, getAllMetaTokens } from "./helpers";
import { metaCache, CACHE_TTL } from "../../../services/integrations/metaCache";

const datePresetEnum = z.enum([
  "today", "yesterday", "last_7d", "last_14d", "last_30d",
  "last_90d", "this_month", "last_month",
]);

export const metaCampaignsRouter = router({
  /** Get campaign-level insights from ALL connected ad accounts */
  campaignInsights: protectedProcedure
    .input(z.object({
      datePreset: datePresetEnum.default("last_30d"),
      limit: z.number().min(1).max(50).default(20),
      accountId: z.number().optional(),
      workspaceId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const cacheKey = metaCache.key("campaignInsights", ctx.user.id, input.accountId, input.datePreset, input.limit, input.workspaceId);
      return metaCache.getOrFetch(cacheKey, CACHE_TTL.CAMPAIGN_INSIGHTS, async () => {
        if (input.accountId) {
          const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
          if (!conn) return [];
          const insights = await getCampaignInsights(conn.adAccountId, conn.token, input.datePreset, input.limit);
          return insights.map(d => ({
            campaignId: d.campaign_id ?? "", campaignName: d.campaign_name ?? "Unknown",
            impressions: Number(d.impressions ?? 0), reach: Number(d.reach ?? 0),
            clicks: Number(d.clicks ?? 0), spend: Number(d.spend ?? 0),
            ctr: Number(d.ctr ?? 0), cpc: Number(d.cpc ?? 0), cpm: Number(d.cpm ?? 0),
          }));
        }
        const allConns = await getAllMetaTokens(ctx.user.id, input.workspaceId);
        if (allConns.length === 0) return [];
        const results = await Promise.allSettled(
          allConns.map(async conn => {
            const insights = await getCampaignInsights(conn.adAccountId, conn.token, input.datePreset, input.limit);
            return insights.map(d => ({
              campaignId: d.campaign_id ?? "", campaignName: d.campaign_name ?? "Unknown",
              impressions: Number(d.impressions ?? 0), reach: Number(d.reach ?? 0),
              clicks: Number(d.clicks ?? 0), spend: Number(d.spend ?? 0),
              ctr: Number(d.ctr ?? 0), cpc: Number(d.cpc ?? 0), cpm: Number(d.cpm ?? 0),
            }));
          }),
        );
        return results.filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled").flatMap(r => r.value);
      });
    }),

  /** Get daily breakdown for a specific campaign */
  campaignDailyInsights: protectedProcedure
    .input(z.object({
      campaignId: z.string().min(1),
      datePreset: datePresetEnum.default("last_30d"),
      workspaceId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const cacheKey = metaCache.key("dailyInsights", ctx.user.id, input.campaignId, input.datePreset, input.workspaceId);
      return metaCache.getOrFetch(cacheKey, CACHE_TTL.DAILY_INSIGHTS, async () => {
        const conn = await getMetaToken(ctx.user.id, undefined, input.workspaceId);
        if (!conn) return [];
        const daily = await getCampaignDailyInsights(input.campaignId, conn.token, input.datePreset);
        return daily.map(d => ({
          date: d.date_start ?? "", impressions: Number(d.impressions ?? 0),
          clicks: Number(d.clicks ?? 0), spend: Number(d.spend ?? 0),
          ctr: Number(d.ctr ?? 0), cpc: Number(d.cpc ?? 0), cpm: Number(d.cpm ?? 0),
          reach: Number(d.reach ?? 0),
        }));
      });
    }),

  /** Get campaigns list */
  campaigns: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      accountId: z.number().optional(),
      workspaceId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const normalizeStatus = (effectiveStatus: string | undefined, rawStatus: string): string => {
        const es = (effectiveStatus ?? rawStatus).toUpperCase();
        if (es === "ACTIVE") return "ACTIVE";
        if (es === "PAUSED" || es === "CAMPAIGN_PAUSED" || es === "ADSET_PAUSED") return "PAUSED";
        if (es === "DELETED" || es === "ARCHIVED") return "ARCHIVED";
        if (es === "IN_PROCESS" || es === "WITH_ISSUES") return "IN_PROCESS";
        return es;
      };

      const mapCampaigns = (campaigns: Awaited<ReturnType<typeof getMetaCampaigns>>, conn: { name: string; adAccountId: string }) =>
        campaigns.map(c => {
          const adsets = (c as any).adsets?.data as Array<{ targeting?: { publisher_platforms?: string[] } }> | undefined;
          const platforms = adsets ? Array.from(new Set(adsets.flatMap(s => s.targeting?.publisher_platforms ?? []))) : [];
          return {
            id: c.id, name: c.name, status: normalizeStatus(c.effective_status, c.status),
            objective: c.objective,
            dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
            lifetimeBudget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
            startTime: c.start_time, stopTime: c.stop_time,
            accountName: conn.name, adAccountId: conn.adAccountId,
            publisherPlatforms: platforms,
          };
        });

      if (input.accountId) {
        const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
        if (!conn) return [];
        const sb = getSupabase();
        const { data: acctData } = await sb.from("social_accounts").select("name").eq("id", input.accountId).limit(1);
        const accountName = acctData?.[0]?.name ?? "";
        const campaigns = await getMetaCampaigns(conn.adAccountId, conn.token, input.limit);
        return mapCampaigns(campaigns, { name: accountName, adAccountId: conn.adAccountId });
      }

      const allConns = await getAllMetaTokens(ctx.user.id, input.workspaceId);
      if (allConns.length === 0) return [];
      const results = await Promise.allSettled(
        allConns.map(async conn => {
          const campaigns = await getMetaCampaigns(conn.adAccountId, conn.token, input.limit);
          return mapCampaigns(campaigns, conn);
        }),
      );
      return results.filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled").flatMap(r => r.value);
    }),

  /** Create a new campaign in Meta Ads */
  createCampaign: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(200),
      objective: z.enum(["OUTCOME_AWARENESS", "OUTCOME_TRAFFIC", "OUTCOME_ENGAGEMENT", "OUTCOME_LEADS", "OUTCOME_APP_PROMOTION", "OUTCOME_SALES"]),
      status: z.enum(["ACTIVE", "PAUSED"]).default("PAUSED"),
      dailyBudget: z.number().min(1).optional(),
      lifetimeBudget: z.number().min(1).optional(),
      startTime: z.string().optional(),
      stopTime: z.string().optional(),
      workspaceId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, undefined, input.workspaceId);
      if (!conn) throw new Error("Meta not connected");
      return createMetaCampaign(conn.adAccountId, conn.token, {
        name: input.name, objective: input.objective, status: input.status,
        dailyBudget: input.dailyBudget ? Math.round(input.dailyBudget * 100) : undefined,
        lifetimeBudget: input.lifetimeBudget ? Math.round(input.lifetimeBudget * 100) : undefined,
        startTime: input.startTime, stopTime: input.stopTime,
      });
    }),

  /** Toggle Meta campaign status (ACTIVE ↔ PAUSED) */
  toggleCampaignStatus: protectedProcedure
    .input(z.object({ campaignId: z.string().min(1), status: z.enum(["ACTIVE", "PAUSED"]), workspaceId: z.number().int().positive().optional() }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, undefined, input.workspaceId);
      if (!conn) throw new Error("Meta not connected");
      const ok = await updateMetaCampaignStatus(input.campaignId, conn.token, input.status);
      return { success: ok };
    }),

  /** Update Meta campaign daily budget */
  updateCampaignBudget: protectedProcedure
    .input(z.object({ campaignId: z.string().min(1), dailyBudget: z.number().min(1), workspaceId: z.number().int().positive().optional() }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, undefined, input.workspaceId);
      if (!conn) throw new Error("Meta not connected");
      const ok = await updateMetaCampaignBudget(input.campaignId, conn.token, input.dailyBudget);
      return { success: ok };
    }),

  /** Get campaign breakdown by dimension */
  campaignBreakdown: protectedProcedure
    .input(z.object({
      campaignId: z.string().min(1),
      breakdown: z.enum(["age", "gender", "country", "impression_device"]),
      datePreset: datePresetEnum.default("last_30d"),
      workspaceId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, undefined, input.workspaceId);
      if (!conn) return [];
      try {
        const data = await getCampaignBreakdown(input.campaignId, conn.token, input.breakdown, input.datePreset);
        return data.map(d => {
          let label = "Unknown";
          if (input.breakdown === "age") label = d.age ?? "Unknown";
          else if (input.breakdown === "gender") label = d.gender ?? "Unknown";
          else if (input.breakdown === "country") label = d.country ?? "Unknown";
          else if (input.breakdown === "impression_device") label = d.impression_device ?? "Unknown";
          return {
            label, impressions: Number(d.impressions ?? 0), reach: Number(d.reach ?? 0),
            clicks: Number(d.clicks ?? 0), spend: Number(d.spend ?? 0),
            ctr: Number(d.ctr ?? 0), cpc: Number(d.cpc ?? 0), cpm: Number(d.cpm ?? 0),
          };
        });
      } catch { return []; }
    }),

  /** Get ad sets for a campaign */
  campaignAdSets: protectedProcedure
    .input(z.object({
      campaignId: z.string(), datePreset: z.string().default("last_30d"),
      accountId: z.number().optional(), workspaceId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const cacheKey = metaCache.key("adSets", ctx.user.id, input.campaignId, input.datePreset, input.accountId, input.workspaceId);
      return metaCache.getOrFetch(cacheKey, CACHE_TTL.CAMPAIGN_AD_SETS, async () => {
        const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
        if (!conn) return { adSets: [], insights: [] };
        try {
          const [adSets, insights] = await Promise.all([
            getCampaignAdSets(input.campaignId, conn.token),
            getAdSetInsights(input.campaignId, conn.token, input.datePreset),
          ]);
          return {
          adSets: adSets.map(s => ({
            id: s.id, name: s.name, status: s.effective_status ?? s.status,
            dailyBudget: s.daily_budget ? Number(s.daily_budget) / 100 : null,
            lifetimeBudget: s.lifetime_budget ? Number(s.lifetime_budget) / 100 : null,
            bidAmount: s.bid_amount ? Number(s.bid_amount) / 100 : null,
            billingEvent: s.billing_event ?? null,
            optimizationGoal: s.optimization_goal ?? null,
            targeting: s.targeting ? {
              ageMin: s.targeting.age_min ?? null, ageMax: s.targeting.age_max ?? null,
              genders: s.targeting.genders ?? [],
              countries: s.targeting.geo_locations?.countries ?? [],
              cities: (s.targeting.geo_locations?.cities ?? []).map(c => c.name),
              devicePlatforms: s.targeting.device_platforms ?? [],
              publisherPlatforms: s.targeting.publisher_platforms ?? [],
              facebookPositions: s.targeting.facebook_positions ?? [],
              instagramPositions: s.targeting.instagram_positions ?? [],
            } : null,
            startTime: s.start_time ?? null, endTime: s.end_time ?? null,
          })),
          insights: insights.map(i => ({
            adsetId: i.adset_id ?? "", adsetName: i.adset_name ?? "",
            impressions: Number(i.impressions ?? 0), reach: Number(i.reach ?? 0),
            clicks: Number(i.clicks ?? 0), spend: Number(i.spend ?? 0),
            ctr: Number(i.ctr ?? 0), cpc: Number(i.cpc ?? 0), cpm: Number(i.cpm ?? 0),
          })),
        };
        } catch (err) {
          console.error("[Meta] campaignAdSets error:", err);
          return { adSets: [], insights: [] };
        }
      });
    }),

  /** Get ads and creatives for a campaign */
  campaignAds: protectedProcedure
    .input(z.object({
      campaignId: z.string(), datePreset: z.string().default("last_30d"),
      accountId: z.number().optional(), workspaceId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const cacheKey = metaCache.key("campaignAds", ctx.user.id, input.campaignId, input.datePreset, input.accountId, input.workspaceId);
      return metaCache.getOrFetch(cacheKey, CACHE_TTL.CAMPAIGN_ADS, async () => {
        const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
        if (!conn) return [];
        try {
        const [ads, insights] = await Promise.all([
          getCampaignAds(input.campaignId, conn.token),
          getAdInsights(input.campaignId, conn.token, input.datePreset),
        ]);
        const insightMap = new Map(
          insights.map(i => [
            (i as unknown as Record<string, string>).ad_id ?? "",
            {
              impressions: Number(i.impressions ?? 0), reach: Number(i.reach ?? 0),
              clicks: Number(i.clicks ?? 0), spend: Number(i.spend ?? 0),
              ctr: Number(i.ctr ?? 0), cpc: Number(i.cpc ?? 0), cpm: Number(i.cpm ?? 0),
            },
          ]),
        );

        return ads.map(ad => {
          const c = ad.creative;
          const oss = c?.object_story_spec;
          const afs = c?.asset_feed_spec;

          let creativeType: "image" | "video" | "carousel" | "dynamic" | "unknown" = "unknown";
          if (afs && ((afs.images?.length ?? 0) > 1 || (afs.videos?.length ?? 0) > 0)) creativeType = "dynamic";
          else if (oss?.link_data?.child_attachments?.length) creativeType = "carousel";
          else if (oss?.video_data || c?.video_id) creativeType = "video";
          else if (oss?.photo_data || oss?.link_data?.picture || c?.image_url) creativeType = "image";

          let imageUrl = c?.image_url ?? c?.thumbnail_url ?? null;
          let videoId = c?.video_id ?? null;
          let message = "";
          let headline = c?.title ?? "";
          let description = c?.body ?? "";
          let ctaType = "";
          let ctaLink = "";
          const carouselCards: Array<{ imageUrl?: string; headline?: string; description?: string; link?: string; videoId?: string }> = [];

          if (oss?.link_data) {
            message = oss.link_data.message ?? message;
            headline = headline || (oss.link_data.caption ?? "");
            description = description || (oss.link_data.description ?? "");
            imageUrl = imageUrl ?? oss.link_data.picture ?? null;
            ctaType = oss.link_data.call_to_action?.type ?? "";
            ctaLink = (oss.link_data.call_to_action?.value?.link ?? oss.link_data.link) ?? "";
            if (oss.link_data.child_attachments) {
              for (const child of oss.link_data.child_attachments) {
                carouselCards.push({
                  imageUrl: child.picture ?? undefined, headline: child.name ?? undefined,
                  description: child.description ?? undefined, link: child.link ?? undefined,
                  videoId: child.video_id ?? undefined,
                });
              }
            }
          }
          if (oss?.video_data) {
            message = oss.video_data.message ?? message;
            headline = headline || (oss.video_data.title ?? "");
            imageUrl = imageUrl ?? oss.video_data.image_url ?? null;
            videoId = videoId ?? oss.video_data.video_id ?? null;
            ctaType = ctaType || (oss.video_data.call_to_action?.type ?? "");
            ctaLink = ctaLink || (oss.video_data.call_to_action?.value?.link ?? "");
          }
          if (oss?.photo_data) {
            message = oss.photo_data.caption ?? message;
            imageUrl = imageUrl ?? oss.photo_data.url ?? null;
          }

          const dynamicAssets = afs ? {
            images: (afs.images ?? []).map(img => img.url ?? "").filter(Boolean),
            videos: (afs.videos ?? []).map(v => ({ videoId: v.video_id ?? "", thumbnail: v.thumbnail_url ?? "" })),
            bodies: (afs.bodies ?? []).map(b => b.text ?? ""),
            titles: (afs.titles ?? []).map(t => t.text ?? ""),
            descriptions: (afs.descriptions ?? []).map(d => d.text ?? ""),
            ctaTypes: afs.call_to_action_types ?? [],
            linkUrls: (afs.link_urls ?? []).map(l => l.website_url ?? ""),
          } : null;

          return {
            id: ad.id, name: ad.name, status: ad.effective_status ?? ad.status,
            adsetId: ad.adset_id ?? null, creativeId: c?.id ?? null, creativeType,
            imageUrl, videoId, thumbnailUrl: c?.thumbnail_url ?? imageUrl,
            message, headline, description, ctaType, ctaLink,
            carouselCards, dynamicAssets,
            insights: insightMap.get(ad.id) ?? null,
          };
        });
        } catch (err) {
          console.error("[Meta] campaignAds error:", err);
          return [];
        }
      });
    }),

  /** Get top performing campaign by spend */
  topCampaign: protectedProcedure
    .input(z.object({ datePreset: z.string().default("last_30d"), accountId: z.number().optional(), workspaceId: z.number().int().positive().optional() }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
      if (!conn) return null;
      try {
        const insights = await getCampaignInsights(conn.adAccountId, conn.token, input.datePreset, 20);
        if (!insights.length) return null;
        const sorted = insights
          .map(c => ({
            id: c.campaign_id ?? "", name: c.campaign_name ?? "Unknown",
            spend: Number(c.spend ?? 0), impressions: Number(c.impressions ?? 0),
            clicks: Number(c.clicks ?? 0), ctr: Number(c.ctr ?? 0), cpc: Number(c.cpc ?? 0),
          }))
          .sort((a, b) => b.spend - a.spend);
        return sorted[0] ?? null;
      } catch { return null; }
    }),

  /** Get all ads across all campaigns */
  allAds: protectedProcedure
    .input(z.object({
      datePreset: z.string().default("last_30d"), accountId: z.number().optional(),
      workspaceId: z.number().int().positive().optional(),
      limit: z.number().min(1).max(100).default(50), campaignId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const allConns = input.accountId
        ? [await getMetaToken(ctx.user.id, input.accountId, input.workspaceId)].filter(Boolean) as Awaited<ReturnType<typeof getMetaToken>>[]
        : await getAllMetaTokens(ctx.user.id, input.workspaceId);
      if (!allConns.length) return [];
      try {
        const allCampaigns = await Promise.allSettled(
          allConns.map((conn, i) => getMetaCampaigns(conn!.adAccountId, conn!.token, input.limit).then(cs => cs.map(c => ({ ...c, _connIdx: i })))),
        );
        let campaigns = allCampaigns
          .filter((r): r is PromiseFulfilledResult<(MetaCampaign & { _connIdx: number })[]> => r.status === "fulfilled")
          .flatMap(r => r.value);
        if (!campaigns.length) return [];
        if (input.campaignId) {
          campaigns = campaigns.filter(c => c.id === input.campaignId);
          if (!campaigns.length) return [];
        }
        const campaignSlice = campaigns.slice(0, 10);
        const adsResults = await Promise.allSettled(
          campaignSlice.map(async c => {
            const conn = allConns[c._connIdx];
            if (!conn) return [];
            const [ads, insights] = await Promise.all([
              getCampaignAds(c.id, conn.token),
              getAdInsights(c.id, conn.token, input.datePreset),
            ]);
            const insightMap = new Map(
              insights.map(i => [
                (i as unknown as Record<string, string>).ad_id ?? "",
                { impressions: Number(i.impressions ?? 0), clicks: Number(i.clicks ?? 0), spend: Number(i.spend ?? 0), ctr: Number(i.ctr ?? 0) },
              ]),
            );
            return ads.map(ad => {
              const cr = ad.creative;
              const oss = cr?.object_story_spec;
              let creativeType: "image" | "video" | "carousel" | "dynamic" | "unknown" = "unknown";
              if (cr?.asset_feed_spec) creativeType = "dynamic";
              else if (oss?.link_data?.child_attachments?.length) creativeType = "carousel";
              else if (oss?.video_data || cr?.video_id) creativeType = "video";
              else if (oss?.photo_data || oss?.link_data?.picture || cr?.image_url) creativeType = "image";
              const ins = insightMap.get(ad.id);
              const fatigueScore = ins && ins.spend > 100 && ins.ctr < 0.5 ? Math.round((0.5 - ins.ctr) / 0.5 * 100) : 0;
              return {
                id: ad.id, name: ad.name, status: ad.effective_status ?? ad.status,
                campaignId: c.id, campaignName: c.name, creativeType,
                imageUrl: cr?.image_url ?? cr?.thumbnail_url ?? null,
                videoId: cr?.video_id ?? null,
                thumbnailUrl: cr?.thumbnail_url ?? cr?.image_url ?? null,
                headline: cr?.title ?? "",
                message: oss?.link_data?.message ?? oss?.video_data?.message ?? "",
                insights: ins ?? null, fatigueScore, isFatigued: fatigueScore > 30,
              };
            });
          }),
        );
        return adsResults.filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled").flatMap(r => r.value);
      } catch (err) {
        console.error("[Meta] allAds error:", err);
        return [];
      }
    }),

  /** Get all ad sets across campaigns */
  allAdSets: protectedProcedure
    .input(z.object({
      datePreset: z.string().default("last_30d"), accountId: z.number().optional(),
      workspaceId: z.number().int().positive().optional(),
      limit: z.number().min(1).max(50).default(25), campaignId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const allConns = input.accountId
        ? [await getMetaToken(ctx.user.id, input.accountId, input.workspaceId)].filter(Boolean) as Awaited<ReturnType<typeof getMetaToken>>[]
        : await getAllMetaTokens(ctx.user.id, input.workspaceId);
      if (!allConns.length) return [];
      try {
        const allCampaigns = await Promise.allSettled(
          allConns.map((conn, i) =>
            getMetaCampaigns(conn!.adAccountId, conn!.token, input.limit).then(cs => cs.map(c => ({ ...c, _connIdx: i }))),
          ),
        );
        let campaigns = allCampaigns
          .filter((r): r is PromiseFulfilledResult<(MetaCampaign & { _connIdx: number })[]> => r.status === "fulfilled")
          .flatMap(r => r.value);
        if (!campaigns.length) return [];
        if (input.campaignId) {
          campaigns = campaigns.filter(c => c.id === input.campaignId);
          if (!campaigns.length) return [];
        }
        const campaignSlice = campaigns.slice(0, 10);
        const adSetResults = await Promise.allSettled(
          campaignSlice.map(async c => {
            const conn = allConns[c._connIdx];
            if (!conn) return [];
            const [adSets, insights] = await Promise.all([
              getCampaignAdSets(c.id, conn.token),
              getAdSetInsights(c.id, conn.token, input.datePreset),
            ]);
            const insightMap = new Map(
              insights.map(i => [
                (i as any).adset_id ?? "",
                {
                  impressions: Number(i.impressions ?? 0), reach: Number(i.reach ?? 0),
                  clicks: Number(i.clicks ?? 0), spend: Number(i.spend ?? 0),
                  ctr: Number(i.ctr ?? 0), cpc: Number(i.cpc ?? 0), cpm: Number(i.cpm ?? 0),
                },
              ]),
            );
            return adSets.map(s => ({
              id: s.id, name: s.name, status: s.effective_status ?? s.status,
              campaignId: c.id, campaignName: c.name,
              dailyBudget: s.daily_budget ? Number(s.daily_budget) / 100 : null,
              lifetimeBudget: s.lifetime_budget ? Number(s.lifetime_budget) / 100 : null,
              bidAmount: s.bid_amount ? Number(s.bid_amount) / 100 : null,
              billingEvent: s.billing_event ?? null, optimizationGoal: s.optimization_goal ?? null,
              targeting: s.targeting ? {
                ageMin: s.targeting.age_min ?? null, ageMax: s.targeting.age_max ?? null,
                genders: s.targeting.genders ?? [], countries: s.targeting.geo_locations?.countries ?? [],
                cities: (s.targeting.geo_locations?.cities ?? []).map(ci => ci.name),
                devicePlatforms: s.targeting.device_platforms ?? [],
                publisherPlatforms: s.targeting.publisher_platforms ?? [],
                facebookPositions: s.targeting.facebook_positions ?? [],
                instagramPositions: s.targeting.instagram_positions ?? [],
              } : null,
              startTime: s.start_time ?? null, endTime: s.end_time ?? null,
              insights: insightMap.get(s.id) ?? null,
            }));
          }),
        );
        return adSetResults.filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled").flatMap(r => r.value);
      } catch (err) {
        console.error("[Meta] allAdSets error:", err);
        return [];
      }
    }),

  /** Bulk pause ads by ID */
  bulkPauseAds: protectedProcedure
    .input(z.object({
      adIds: z.array(z.string()).min(1).max(50),
      accountId: z.number().optional(),
      workspaceId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
      if (!conn) throw new Error("No Meta connection found");
      const results = await Promise.allSettled(
        input.adIds.map(adId =>
          fetch(`https://graph.facebook.com/v19.0/${adId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "PAUSED", access_token: conn.token }),
          }).then(r => r.json()),
        ),
      );
      const succeeded = results.filter(r => r.status === "fulfilled" && (r.value as any).success).length;
      const failed = results.length - succeeded;
      return { succeeded, failed, total: results.length };
    }),
});
