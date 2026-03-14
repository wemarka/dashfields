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
  getPageInfo,
  getImageUrlsFromHashes,
  getVideoSource,
  getAdCreativePreviews,
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
      accountIds: z.array(z.number()).optional(), // group selection: multiple account IDs
      workspaceId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const cacheKey = metaCache.key("campaignInsights", ctx.user.id, input.accountIds ? input.accountIds.join(",") : input.accountId, input.datePreset, input.limit, input.workspaceId);
      return metaCache.getOrFetch(cacheKey, CACHE_TTL.CAMPAIGN_INSIGHTS, async () => {
        // Helper: sum actions by type keywords
        const sumActions = (actions: Array<{ action_type: string; value: string }> | undefined, keywords: string[]): number => {
          if (!actions) return 0;
          return actions
            .filter(a => keywords.some(k => a.action_type.includes(k)))
            .reduce((sum, a) => sum + Number(a.value ?? 0), 0);
        };

        const mapInsights = (insights: Awaited<ReturnType<typeof getCampaignInsights>>) =>
          insights.map(d => ({
            campaignId: d.campaign_id ?? "", campaignName: d.campaign_name ?? "Unknown",
            impressions: Number(d.impressions ?? 0), reach: Number(d.reach ?? 0),
            clicks: Number(d.clicks ?? 0), spend: Number(d.spend ?? 0),
            ctr: Number(d.ctr ?? 0), cpc: Number(d.cpc ?? 0), cpm: Number(d.cpm ?? 0),
            // Conversions: all conversions (leads + purchases + registrations)
            conversions: sumActions(d.actions, [
              "onsite_conversion.lead_grouped",
              "offsite_conversion.fb_pixel_purchase",
              "offsite_conversion.fb_pixel_complete_registration",
              "onsite_conversion.purchase",
            ]),
            // Leads: all lead types grouped (Messenger leads + Instant Form leads)
            leads: sumActions(d.actions, [
              "onsite_conversion.lead_grouped",
            ]),
            // Calls: click-to-call actions (confirmed calls + native calls placed)
            calls: sumActions(d.actions, [
              "click_to_call_call_confirm",
              "click_to_call_native_call_placed",
              "click_to_call_native_20s_call_connect",
              "click_to_call_native_60s_call_connect",
              "click_to_call_callback_request_submitted",
              "call_confirm_grouped",
            ]),
            // Messages: messaging conversations started — matches Meta Ads Manager "Messaging Conversations Started"
            // Use messaging_conversation_started_7d ONLY (total_messaging_connection is a superset that causes double-counting)
            messages: sumActions(d.actions, [
              "onsite_conversion.messaging_conversation_started_7d",
            ]),
            // Messaging detail breakdown (for Drawer)
            messagingFirstReply: sumActions(d.actions, ["onsite_conversion.messaging_first_reply"]),
            messagingReplied7d: sumActions(d.actions, ["onsite_conversion.messaging_conversation_replied_7d"]),
          }));

        // Group selection: fetch insights from all accounts in the group
        if (input.accountIds && input.accountIds.length > 0) {
          const sb = getSupabase();
          const { data: acctRows } = await sb
            .from("social_accounts")
            .select("access_token, platform_account_id, platform")
            .eq("user_id", ctx.user.id)
            .in("id", input.accountIds)
            .eq("is_active", true);
          const adAccounts = (acctRows ?? []).filter(
            d => d.access_token && d.platform_account_id && d.platform === "facebook"
          );
          if (adAccounts.length === 0) return [];
          const results = await Promise.allSettled(
            adAccounts.map(async acct => {
              const insights = await getCampaignInsights(acct.platform_account_id, acct.access_token, input.datePreset, input.limit);
              return mapInsights(insights);
            })
          );
          return results.filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled").flatMap(r => r.value);
        }

        if (input.accountId) {
          const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
          if (!conn) return [];
          const insights = await getCampaignInsights(conn.adAccountId, conn.token, input.datePreset, input.limit);
          return mapInsights(insights);
        }
        const allConns = await getAllMetaTokens(ctx.user.id, input.workspaceId);
        if (allConns.length === 0) return [];
        const results = await Promise.allSettled(
          allConns.map(async conn => {
            const insights = await getCampaignInsights(conn.adAccountId, conn.token, input.datePreset, input.limit);
            return mapInsights(insights);
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
      accountIds: z.array(z.number()).optional(), // group selection: multiple account IDs
      workspaceId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const now = Date.now();

      /**
       * Determine the true campaign status.
       * Meta sometimes keeps effective_status=ACTIVE even after a campaign's stop_time
       * has passed (e.g. boosted posts with a fixed end date, lifetime-budget campaigns
       * that exhausted their budget long ago). We override to ENDED in that case.
       */
      const normalizeStatus = (
        effectiveStatus: string | undefined,
        rawStatus: string,
        stopTime?: string
      ): string => {
        // If stop_time is set and is in the past, the campaign has ended regardless of Meta's status
        if (stopTime) {
          const stopMs = new Date(stopTime).getTime();
          if (!isNaN(stopMs) && stopMs < now) return "ENDED";
        }
        const es = (effectiveStatus ?? rawStatus).toUpperCase();
        if (es === "ACTIVE") return "ACTIVE";
        if (es === "PAUSED" || es === "CAMPAIGN_PAUSED" || es === "ADSET_PAUSED") return "PAUSED";
        if (es === "DELETED" || es === "ARCHIVED") return "ARCHIVED";
        if (es === "IN_PROCESS") return "IN_PROCESS";
        if (es === "WITH_ISSUES") return "WITH_ISSUES";
        return es;
      };

      const mapCampaigns = (campaigns: Awaited<ReturnType<typeof getMetaCampaigns>>, conn: { name: string; adAccountId: string }) =>
        campaigns.map(c => {
          const adsets = (c as any).adsets?.data as Array<{ targeting?: { publisher_platforms?: string[] } }> | undefined;
          const platforms = adsets ? Array.from(new Set(adsets.flatMap(s => s.targeting?.publisher_platforms ?? []))) : [];
          return {
            id: c.id, name: c.name, status: normalizeStatus(c.effective_status, c.status, c.stop_time),
            objective: c.objective,
            dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
            lifetimeBudget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
            startTime: c.start_time, stopTime: c.stop_time,
            accountName: conn.name, adAccountId: conn.adAccountId,
            publisherPlatforms: platforms,
          };
        });

      // If accountIds array is provided (group selection), fetch from all those accounts
      if (input.accountIds && input.accountIds.length > 0) {
        const sb = getSupabase();
        const { data: acctRows, error: acctErr } = await sb
          .from("social_accounts")
          .select("id, name, access_token, platform_account_id, platform")
          .eq("user_id", ctx.user.id)
          .in("id", input.accountIds)
          .eq("is_active", true);
        console.log("[Meta.campaigns] accountIds:", input.accountIds, "userId:", ctx.user.id, "acctRows:", acctRows?.length, "err:", acctErr?.message);
        // Only use facebook/ad_account rows that have tokens
        const adAccounts = (acctRows ?? []).filter(
          d => d.access_token && d.platform_account_id && d.platform === "facebook"
        );
        console.log("[Meta.campaigns] facebook adAccounts:", adAccounts.map(a => ({ id: a.id, name: a.name, platform: a.platform, adAccountId: a.platform_account_id })));
        if (adAccounts.length === 0) return [];
        const results = await Promise.allSettled(
          adAccounts.map(async acct => {
            const campaigns = await getMetaCampaigns(acct.platform_account_id, acct.access_token, input.limit);
            console.log("[Meta.campaigns] fetched", campaigns.length, "campaigns for", acct.name);
            return mapCampaigns(campaigns, { name: acct.name ?? "", adAccountId: acct.platform_account_id });
          })
        );
        const allCampaigns = results.filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled").flatMap(r => r.value);
        console.log("[Meta.campaigns] total campaigns returned:", allCampaigns.length);
        return allCampaigns;
      }

      if (input.accountId) {
        const sb = getSupabase();
        // First check if the selected account is a facebook ad account
        let conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
        if (!conn) {
          // The selected account might be Instagram — find the facebook accounts in the same workspace
          const { data: acctInfo } = await sb.from("social_accounts").select("workspace_id").eq("id", input.accountId).limit(1);
          const wsId = acctInfo?.[0]?.workspace_id ?? input.workspaceId;
          // Fall back to all facebook accounts in the same workspace
          const allConns = await getAllMetaTokens(ctx.user.id, wsId);
          if (allConns.length === 0) return [];
          const results = await Promise.allSettled(
            allConns.map(async c => {
              const campaigns = await getMetaCampaigns(c.adAccountId, c.token, input.limit);
              return mapCampaigns(campaigns, c);
            })
          );
          return results.filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled").flatMap(r => r.value);
        }
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

        // Collect unique page IDs from all ads
        const pageIds = new Set<string>();
        // Collect all image_hashes that need URL resolution
        const imageHashes = new Set<string>();
        for (const ad of ads) {
          const c = ad.creative;
          const oss = c?.object_story_spec;
          const afs = c?.asset_feed_spec;
          const pageId = oss?.page_id;
          if (pageId) pageIds.add(pageId);
          // Also try from effective_object_story_id (format: pageId_postId)
          const storyId = c?.effective_object_story_id;
          if (storyId) {
            const pid = storyId.split("_")[0];
            if (pid) pageIds.add(pid);
          }
          // Collect image hashes when image_url is missing
          if (!c?.image_url) {
            if (c?.image_hash) imageHashes.add(c.image_hash);
            if (oss?.link_data?.image_hash) imageHashes.add(oss.link_data.image_hash);
            if (oss?.video_data?.image_hash) imageHashes.add(oss.video_data.image_hash);
            if (oss?.photo_data?.image_hash) imageHashes.add(oss.photo_data.image_hash);
            // Carousel child attachments
            for (const child of oss?.link_data?.child_attachments ?? []) {
              if (child.image_hash) imageHashes.add(child.image_hash);
            }
            // Dynamic asset images
            for (const img of afs?.images ?? []) {
              if (img.hash) imageHashes.add(img.hash);
            }
          }
        }

        // Fetch page info + resolve image hashes in parallel
        const pageInfoMap = new Map<string, { name: string; pictureUrl: string | null }>();
        const [, hashUrlMap] = await Promise.all([
          // Page info
          (async () => {
            if (pageIds.size > 0) {
              const pageInfoResults = await Promise.allSettled(
                Array.from(pageIds).map(async pid => {
                  const info = await getPageInfo(pid, conn.token);
                  return { pid, info };
                })
              );
              for (const r of pageInfoResults) {
                if (r.status === "fulfilled" && r.value.info) {
                  pageInfoMap.set(r.value.pid, { name: r.value.info.name, pictureUrl: r.value.info.pictureUrl });
                }
              }
            }
          })(),
          // Image hash resolution
          imageHashes.size > 0
            ? getImageUrlsFromHashes(conn.adAccountId, conn.token, Array.from(imageHashes))
            : Promise.resolve(new Map<string, string>()),
        ]);

        // Helper to resolve image from hash or direct URL
        const resolveImageUrl = (directUrl?: string | null, hash?: string | null): string | null => {
          if (directUrl) return directUrl;
          if (hash) return hashUrlMap.get(hash) ?? null;
          return null;
        };

        return ads.map(ad => {
          const c = ad.creative;
          const oss = c?.object_story_spec;
          const afs = c?.asset_feed_spec;

          // Resolve page info for this ad
          let pageId = oss?.page_id ?? null;
          if (!pageId && c?.effective_object_story_id) {
            pageId = c.effective_object_story_id.split("_")[0] ?? null;
          }
          const pageInfo = pageId ? pageInfoMap.get(pageId) : null;

          let creativeType: "image" | "video" | "carousel" | "dynamic" | "unknown" = "unknown";
          if (afs && ((afs.images?.length ?? 0) > 1 || (afs.videos?.length ?? 0) > 0)) creativeType = "dynamic";
          else if (oss?.link_data?.child_attachments?.length) creativeType = "carousel";
          else if (oss?.video_data || c?.video_id) creativeType = "video";
          else if (oss?.photo_data || oss?.link_data?.picture || oss?.link_data?.image_hash || c?.image_url || c?.image_hash) creativeType = "image";

          // Resolve imageUrl: direct URL first, then hash lookup
          let imageUrl = resolveImageUrl(c?.image_url, c?.image_hash) ?? c?.thumbnail_url ?? null;
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
            // Resolve link_data picture: direct URL or hash
            const ldImageUrl = resolveImageUrl(oss.link_data.picture, oss.link_data.image_hash);
            imageUrl = imageUrl ?? ldImageUrl ?? null;
            ctaType = oss.link_data.call_to_action?.type ?? "";
            ctaLink = (oss.link_data.call_to_action?.value?.link ?? oss.link_data.link) ?? "";
            if (oss.link_data.child_attachments) {
              for (const child of oss.link_data.child_attachments) {
                // Resolve carousel card image: direct picture or hash
                const cardImageUrl = resolveImageUrl(child.picture, child.image_hash);
                carouselCards.push({
                  imageUrl: cardImageUrl ?? undefined, headline: child.name ?? undefined,
                  description: child.description ?? undefined, link: child.link ?? undefined,
                  videoId: child.video_id ?? undefined,
                });
              }
            }
          }
          if (oss?.video_data) {
            message = oss.video_data.message ?? message;
            headline = headline || (oss.video_data.title ?? "");
            // Resolve video thumbnail: direct URL or hash
            const vdImageUrl = resolveImageUrl(oss.video_data.image_url, oss.video_data.image_hash);
            imageUrl = imageUrl ?? vdImageUrl ?? null;
            videoId = videoId ?? oss.video_data.video_id ?? null;
            ctaType = ctaType || (oss.video_data.call_to_action?.type ?? "");
            ctaLink = ctaLink || (oss.video_data.call_to_action?.value?.link ?? "");
          }
          if (oss?.photo_data) {
            message = oss.photo_data.caption ?? message;
            // Resolve photo: direct URL or hash
            const pdImageUrl = resolveImageUrl(oss.photo_data.url, oss.photo_data.image_hash);
            imageUrl = imageUrl ?? pdImageUrl ?? null;
          }

          const dynamicAssets = afs ? {
            // Resolve dynamic asset images: URL first, then hash
            images: (afs.images ?? []).map(img => img.url ?? (img.hash ? hashUrlMap.get(img.hash) ?? "" : "")).filter(Boolean),
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
            // Page info from Meta Graph API
            pageId: pageId ?? null,
            pageName: pageInfo?.name ?? null,
            pageAvatarUrl: pageInfo?.pictureUrl ?? null,
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

  /**
   * Get campaign insights for the previous period (for vs-period comparison).
   * Maps datePreset to its equivalent previous period using time_range.
   */
  campaignPreviousPeriodInsights: protectedProcedure
    .input(z.object({
      campaignId: z.string().min(1),
      datePreset: datePresetEnum.default("last_30d"),
      workspaceId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, undefined, input.workspaceId);
      if (!conn) return null;
      try {
        // Compute previous period date range
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const daysMap: Record<string, number> = {
          today: 1, yesterday: 1, last_7d: 7, last_14d: 14,
          last_30d: 30, last_90d: 90, this_month: today.getDate(),
          last_month: 30,
        };
        const days = daysMap[input.datePreset] ?? 30;
        const prevEnd = new Date(today);
        prevEnd.setDate(prevEnd.getDate() - days);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - days);
        const fmt = (d: Date) => d.toISOString().slice(0, 10);
        const timeRange = JSON.stringify({ since: fmt(prevStart), until: fmt(prevEnd) });

        const url = new URL(`https://graph.facebook.com/v19.0/${input.campaignId}/insights`);
        url.searchParams.set("access_token", conn.token);
        url.searchParams.set("fields", "impressions,reach,clicks,spend,ctr,cpc,cpm");
        url.searchParams.set("time_range", timeRange);
        const res = await fetch(url.toString());
        const json = await res.json() as { data?: Array<Record<string, string>>; error?: { message: string } };
        if (json.error || !json.data?.length) return null;
        const d = json.data[0];
        return {
          impressions: Number(d.impressions ?? 0),
          reach: Number(d.reach ?? 0),
          clicks: Number(d.clicks ?? 0),
          spend: Number(d.spend ?? 0),
          ctr: Number(d.ctr ?? 0),
          cpc: Number(d.cpc ?? 0),
          cpm: Number(d.cpm ?? 0),
        };
      } catch { return null; }
    }),

  /** Clear server-side Meta API cache for a specific campaign (manual refresh) */
  clearCampaignCache: protectedProcedure
    .input(z.object({
      campaignId: z.string().optional(),
      workspaceId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.campaignId) {
        // Clear all cache keys that include this campaignId
        metaCache.invalidatePrefix(`adSets:${ctx.user.id}:${input.campaignId}`);
        metaCache.invalidatePrefix(`campaignAds:${ctx.user.id}:${input.campaignId}`);
        metaCache.invalidatePrefix(`dailyInsights:${ctx.user.id}:${input.campaignId}`);
      }
      // Always clear campaign insights list
      metaCache.invalidatePrefix(`campaignInsights:${ctx.user.id}`);
      return { cleared: true };
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

  /**
   * Get official Meta Ad Preview iframe HTML for a given creative ID and ad format.
   * Returns the raw iframe HTML string from Meta's /{creative_id}/previews endpoint.
   *
   * Cache strategy:
   *  1. Check ad_preview_cache in Supabase (TTL: 24h)
   *  2. On cache hit → return immediately (no Meta API call)
   *  3. On cache miss → call Meta API, store result, return iframe HTML
   *
   * Supported formats: DESKTOP_FEED_STANDARD, MOBILE_FEED_STANDARD, INSTAGRAM_STANDARD,
   * INSTAGRAM_STORY, INSTAGRAM_REELS, FACEBOOK_REELS, FACEBOOK_STORY_MOBILE
   */
  adPreviews: protectedProcedure
    .input(z.object({
      creativeId: z.string().min(1),
      adFormat: z.string().default("DESKTOP_FEED_STANDARD"),
      accountId: z.number().optional(),
      workspaceId: z.number().int().positive().optional(),
      forceRefresh: z.boolean().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();
      const now = new Date();

      // ── 1. Cache lookup (skip if forceRefresh) ──────────────────────────────
      if (!input.forceRefresh) {
        const { data: cached } = await sb
          .from("ad_preview_cache")
          .select("iframe_html, cached_at, expires_at")
          .eq("creative_id", input.creativeId)
          .eq("ad_format", input.adFormat)
          .eq("user_id", ctx.user.id)
          .gt("expires_at", now.toISOString())
          .order("cached_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cached?.iframe_html) {
          console.log(`[Meta] adPreviews cache HIT: ${input.creativeId}/${input.adFormat}`);
          return {
            iframeHtml: cached.iframe_html,
            fromCache: true,
            cachedAt: cached.cached_at,
            expiresAt: cached.expires_at,
          };
        }
      }

      // ── 2. Cache miss → call Meta API ───────────────────────────────────────
      const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
      if (!conn) return { iframeHtml: null, fromCache: false };

      try {
        const previews = await getAdCreativePreviews(input.creativeId, conn.token, input.adFormat);
        const iframeHtml = previews[0] ?? null;

        if (iframeHtml) {
          // ── 3. Write to cache (upsert — overwrite if exists) ───────────────
          const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h
          const { error: upsertErr } = await sb
            .from("ad_preview_cache")
            .upsert(
              {
                creative_id: input.creativeId,
                ad_format: input.adFormat,
                user_id: ctx.user.id,
                iframe_html: iframeHtml,
                cached_at: now.toISOString(),
                expires_at: expiresAt.toISOString(),
              },
              { onConflict: "creative_id,ad_format,user_id" }
            );

          if (upsertErr) {
            console.warn("[Meta] adPreviews cache write failed:", upsertErr.message);
          } else {
            console.log(`[Meta] adPreviews cache MISS → stored: ${input.creativeId}/${input.adFormat}`);
          }
        }

        return { iframeHtml, fromCache: false, cachedAt: now.toISOString(), expiresAt: null };
      } catch (err) {
        console.error("[Meta] adPreviews error:", err);
        return { iframeHtml: null, fromCache: false };
      }
    }),

  /**
   * Invalidate (delete) cached previews for a specific creative or all creatives.
   * Useful when the creative is updated and the cached iframe is stale.
   */
  clearAdPreviewCache: protectedProcedure
    .input(z.object({
      creativeId: z.string().optional(),  // omit to clear ALL for this user
      adFormat: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      let query = sb
        .from("ad_preview_cache")
        .delete()
        .eq("user_id", ctx.user.id);

      if (input.creativeId) query = query.eq("creative_id", input.creativeId);
      if (input.adFormat)   query = query.eq("ad_format", input.adFormat);

      const { error, count } = await query;
      if (error) throw new Error(error.message);
      console.log(`[Meta] adPreviewCache cleared: ${count ?? "?"} entries for user ${ctx.user.id}`);
      return { cleared: count ?? 0 };
    }),

  /** Bulk toggle campaign status (ACTIVE ↔ PAUSED) for multiple campaigns */
  bulkToggleCampaigns: protectedProcedure
    .input(z.object({
      campaignIds: z.array(z.string().min(1)).min(1).max(50),
      status: z.enum(["ACTIVE", "PAUSED"]),
      accountId: z.number().optional(),
      workspaceId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
      if (!conn) throw new Error("No Meta connection found");
      const results = await Promise.allSettled(
        input.campaignIds.map(id =>
          updateMetaCampaignStatus(id, conn.token, input.status)
        ),
      );
      const succeeded = results.filter(r => r.status === "fulfilled" && r.value).length;
      const failed = results.length - succeeded;
      return { succeeded, failed, total: results.length };
    }),

  /** Toggle pin status for a campaign (works for both Meta API and local campaigns) */
  pinCampaign: protectedProcedure
    .input(z.object({
      campaignId: z.string().min(1),
      source: z.enum(["api", "local"]).default("api"),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      // Check if already pinned
      const { data: existing } = await sb
        .from("pinned_campaigns")
        .select("id")
        .eq("user_id", ctx.user.id)
        .eq("campaign_id", input.campaignId)
        .maybeSingle();

      if (existing) {
        // Unpin
        await sb.from("pinned_campaigns").delete().eq("id", existing.id);
        return { pinned: false };
      } else {
        // Pin
        await sb.from("pinned_campaigns").insert({
          user_id: ctx.user.id,
          campaign_id: input.campaignId,
          source: input.source,
          pinned_at: new Date().toISOString(),
        });
        return { pinned: true };
      }
    }),

  /** Get all pinned campaign IDs for the current user */
  getPinnedCampaigns: protectedProcedure
    .query(async ({ ctx }) => {
      const sb = getSupabase();
      const { data } = await sb
        .from("pinned_campaigns")
        .select("campaign_id, source, pinned_at")
        .eq("user_id", ctx.user.id)
        .order("pinned_at", { ascending: false });
      return (data ?? []).map(r => ({ campaignId: r.campaign_id, source: r.source, pinnedAt: r.pinned_at }));
    }),

  /** Edit a Meta campaign: update name, status, daily budget via Meta API */
  editMetaCampaign: protectedProcedure
    .input(z.object({
      campaignId: z.string().min(1),
      name: z.string().min(1).max(256).optional(),
      status: z.enum(["ACTIVE", "PAUSED"]).optional(),
      dailyBudget: z.number().positive().optional(), // in account currency (not cents)
      accountId: z.number().optional(),
      workspaceId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
      if (!conn) throw new Error("No Meta connection found");

      const body: Record<string, string | number> = {};
      if (input.name)        body.name = input.name;
      if (input.status)      body.status = input.status;
      if (input.dailyBudget) body.daily_budget = Math.round(input.dailyBudget * 100); // cents

      if (!Object.keys(body).length) throw new Error("Nothing to update");

      body.access_token = conn.token;

      const res = await fetch(`https://graph.facebook.com/v19.0/${input.campaignId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { success?: boolean; error?: { message: string } };
      if (json.error) throw new Error(json.error.message);

      // Invalidate cache
      metaCache.invalidatePrefix(`campaignInsights:${ctx.user.id}`);
      return { success: true };
    }),

  /** Get video source URL from Meta Graph API for a given video_id */
  videoSource: protectedProcedure
    .input(z.object({
      videoId: z.string().min(1),
      accountId: z.number().optional(),
      workspaceId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
      if (!conn) return null;
      try {
        const sourceUrl = await getVideoSource(input.videoId, conn.token);
        return sourceUrl ? { url: sourceUrl } : null;
      } catch {
        return null;
      }
    }),
});
