/**
 * server/services/cache/cacheConfig.ts
 *
 * Centralized TTL (Time-To-Live) constants for all server-side caches.
 * Used by metaCache and any future cache implementations.
 *
 * All values are in seconds.
 */

export const SERVER_CACHE_TTL = {
  // ── Meta API — Campaign data ──────────────────────────────────────────────
  /** Campaign list — changes rarely, expensive to fetch */
  CAMPAIGNS: 5 * 60,               // 5 minutes

  /** Campaign insights (spend, clicks, impressions) */
  CAMPAIGN_INSIGHTS: 3 * 60,       // 3 minutes

  /** Daily insights time-series for charts */
  DAILY_INSIGHTS: 5 * 60,          // 5 minutes

  /** Campaign breakdown (by age, gender, placement) */
  CAMPAIGN_BREAKDOWN: 10 * 60,     // 10 minutes

  /** Ad sets per campaign */
  CAMPAIGN_AD_SETS: 5 * 60,        // 5 minutes

  /** Ads/creatives per campaign */
  CAMPAIGN_ADS: 5 * 60,            // 5 minutes

  /** Ad set insights */
  AD_SET_INSIGHTS: 5 * 60,         // 5 minutes

  // ── Meta API — Analytics data ─────────────────────────────────────────────
  /** Cross-platform all insights (heavy query) */
  ALL_INSIGHTS: 10 * 60,           // 10 minutes

  /** Period comparison (current vs previous) */
  COMPARE_INSIGHTS: 10 * 60,       // 10 minutes

  /** Audience demographics (age, gender, location) */
  AUDIENCE_DEMOGRAPHICS: 15 * 60,  // 15 minutes

  // ── Meta API — Account data ───────────────────────────────────────────────
  /** Page info (name, followers, profile pic) */
  PAGE_INFO: 30 * 60,              // 30 minutes

  /** Video source URLs */
  VIDEO_SOURCE: 30 * 60,           // 30 minutes

  // ── Ad Previews (Supabase-backed, longer TTL) ─────────────────────────────
  /** Ad preview iframe HTML — stored in Supabase with 24h TTL */
  AD_PREVIEWS_SUPABASE: 24 * 60 * 60, // 24 hours (in Supabase)
} as const;
