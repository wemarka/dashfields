// Meta Graph API helper
// Calls Meta Marketing API using a stored user access token.

const META_GRAPH_BASE = "https://graph.facebook.com/v19.0";

/** Ensure ad account ID has the required act_ prefix */
function ensureActPrefix(id: string): string {
  return id.startsWith("act_") ? id : `act_${id}`;
}

export interface MetaInsight {
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  spend?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  frequency?: string;
  date_start?: string;
  date_stop?: string;
  actions?: Array<{ action_type: string; value: string }>;
  cost_per_action_type?: Array<{ action_type: string; value: string }>;
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
  created_time?: string;
  // Publisher platforms (e.g. ['facebook', 'instagram', 'audience_network', 'messenger'])
  // Fetched from the targeting spec of the campaign's ad sets
  publisher_platforms?: string[];
}

export interface MetaAdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  timezone_name?: string;
  business?: { id: string; name: string };
}

async function metaGet<T>(
  path: string,
  accessToken: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${META_GRAPH_BASE}/${path}`);
  url.searchParams.set("access_token", accessToken);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  // Handle empty response bodies (204 No Content or empty body) gracefully
  const text = await res.text();
  if (!text || text.trim() === "") {
    return { data: [] } as unknown as T;
  }
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    console.warn(`[Meta API] Non-JSON response for path=${path}: ${text.slice(0, 100)}`);
    return { data: [] } as unknown as T;
  }
  if (!res.ok || json.error) {
    const err = json.error as Record<string, unknown> | undefined;
    const code = err?.code as number | undefined;
    const msg = (err?.message as string) ?? `Meta API error: ${res.status}`;
    // Error #100: nonexisting field — usually means no insights data or missing ads_read permission.
    // Return empty data structure instead of throwing to avoid breaking the UI.
    if (code === 100 || msg.includes("nonexisting field")) {
      console.warn(`[Meta API] Graceful fallback for path=${path}: ${msg}`);
      return { data: [] } as unknown as T;
    }
    // Rate limit errors — return empty data gracefully to prevent UI crashes.
    // Meta rate limit error codes: 17 (user limit), 80000, 80003 (app limit)
    const isRateLimit =
      code === 17 || code === 80000 || code === 80003 ||
      msg.includes("User request limit") ||
      msg.includes("rate limit") ||
      msg.includes("too many calls") ||
      msg.includes("Application request limit");
    if (isRateLimit) {
      console.warn(`[Meta API] Rate limit hit for path=${path}: ${msg}`);
      return { data: [] } as unknown as T;
    }
    throw new Error(msg);
  }
  return json as T;
}

/** Get all ad accounts accessible by this token */
export async function getAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
  const data = await metaGet<{ data: MetaAdAccount[] }>(
    "me/adaccounts",
    accessToken,
    { fields: "id,name,account_status,currency,timezone_name,business", limit: "50" }
  );
  return data.data ?? [];
}

/** Get the profile picture URL for an ad account.
 * Strategy: promote_pages → ads creative page → null.
 * Each fallback is tried in order until a valid picture URL is found. */
export async function getAdAccountPicture(
  adAccountId: string,
  accessToken: string
): Promise<string | null> {
  const actId = ensureActPrefix(adAccountId);
  try {
    // Strategy 1: Get the ad account's promoted pages (Facebook Page linked to the ad account)
    const pagesData = await metaGet<{ data: Array<{ id: string; name: string; picture?: { data?: { url?: string } } }> }>(
      `${actId}/promote_pages`,
      accessToken,
      { fields: "id,name,picture{url}", limit: "1" }
    );
    const pageUrl = pagesData.data?.[0]?.picture?.data?.url;
    if (pageUrl) return pageUrl;

    // Strategy 2: Get the page from the ad account's ads creative
    // Each ad has a creative with effective_object_story_id = "pageId_postId"
    const adsData = await metaGet<{ data: Array<{ creative?: { effective_object_story_id?: string } }> }>(
      `${actId}/ads`,
      accessToken,
      { fields: "creative{effective_object_story_id}", limit: "1" }
    );
    const storyId = adsData.data?.[0]?.creative?.effective_object_story_id;
    if (storyId) {
      const pageId = storyId.split("_")[0];
      if (pageId) {
        const pagePicData = await metaGet<{ data?: { url?: string } }>(
          `${pageId}/picture`,
          accessToken,
          { redirect: "false", type: "small" }
        );
        if (pagePicData.data?.url) return pagePicData.data.url;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/** Get campaigns for an ad account */
export async function getMetaCampaigns(
  adAccountId: string,
  accessToken: string,
  limit = 25
): Promise<MetaCampaign[]> {
  const data = await metaGet<{ data: MetaCampaign[] }>(
    `${ensureActPrefix(adAccountId)}/campaigns`,
    accessToken,
    {
      fields: "id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time,adsets{targeting{publisher_platforms}}",
      limit: String(limit),
    }
  );
  return data.data ?? [];
}

/** Get account-level insights (aggregate) */
export async function getAccountInsights(
  adAccountId: string,
  accessToken: string,
  datePreset = "last_30d"
): Promise<MetaInsight[]> {
  const data = await metaGet<{ data: MetaInsight[] }>(
    `${ensureActPrefix(adAccountId)}/insights`,
    accessToken,
    {
      fields: "impressions,reach,clicks,spend,ctr,cpc,cpm,frequency,actions",
      date_preset: datePreset,
    }
  );
  return data.data ?? [];
}

/** Get campaign-level insights */
export async function getCampaignInsights(
  adAccountId: string,
  accessToken: string,
  datePreset = "last_30d",
  limit = 25
): Promise<MetaInsight[]> {
  const data = await metaGet<{ data: MetaInsight[] }>(
    `${ensureActPrefix(adAccountId)}/insights`,
    accessToken,
    {
      level: "campaign",
      fields: "campaign_id,campaign_name,impressions,reach,clicks,spend,ctr,cpc,cpm,actions",
      date_preset: datePreset,
      limit: String(limit),
    }
  );
  return data.data ?? [];
}

/** Create a new campaign in a Meta ad account */
export async function createMetaCampaign(
  adAccountId: string,
  accessToken: string,
  params: {
    name: string;
    objective: string;
    status: string;
    dailyBudget?: number; // in cents
    lifetimeBudget?: number; // in cents
    startTime?: string;
    stopTime?: string;
  }
): Promise<{ id: string; name: string }> {
  const url = new URL(`${META_GRAPH_BASE}/${ensureActPrefix(adAccountId)}/campaigns`);
  url.searchParams.set("access_token", accessToken);
  const body = new URLSearchParams();
  body.set("name", params.name);
  body.set("objective", params.objective);
  body.set("status", params.status);
  body.set("special_ad_categories", "[]");
  if (params.dailyBudget) body.set("daily_budget", String(params.dailyBudget));
  if (params.lifetimeBudget) body.set("lifetime_budget", String(params.lifetimeBudget));
  if (params.startTime) body.set("start_time", params.startTime);
  if (params.stopTime) body.set("stop_time", params.stopTime);
  const res = await fetch(url.toString(), { method: "POST", body });
  const json = await res.json() as Record<string, unknown>;
  if (!res.ok || json.error) {
    const err = json.error as Record<string, string> | undefined;
    throw new Error(err?.message ?? `Meta API error: ${res.status}`);
  }
  return { id: json.id as string, name: params.name };
}

/** Update campaign status (ACTIVE / PAUSED) */
export async function updateMetaCampaignStatus(
  campaignId: string,
  accessToken: string,
  status: "ACTIVE" | "PAUSED"
): Promise<boolean> {
  const url = new URL(`${META_GRAPH_BASE}/${campaignId}`);
  url.searchParams.set("access_token", accessToken);
  const body = new URLSearchParams();
  body.set("status", status);
  const res = await fetch(url.toString(), { method: "POST", body });
  const json = await res.json() as Record<string, unknown>;
  if (!res.ok || json.error) {
    const err = json.error as Record<string, string> | undefined;
    throw new Error(err?.message ?? `Meta API error: ${res.status}`);
  }
  return json.success === true;
}

/** Update campaign daily budget (amount in USD, converted to cents) */
export async function updateMetaCampaignBudget(
  campaignId: string,
  accessToken: string,
  dailyBudgetUsd: number
): Promise<boolean> {
  const url = new URL(`${META_GRAPH_BASE}/${campaignId}`);
  url.searchParams.set("access_token", accessToken);
  const body = new URLSearchParams();
  body.set("daily_budget", String(Math.round(dailyBudgetUsd * 100)));
  const res = await fetch(url.toString(), { method: "POST", body });
  const json = await res.json() as Record<string, unknown>;
  if (!res.ok || json.error) {
    const err = json.error as Record<string, string> | undefined;
    throw new Error(err?.message ?? `Meta API error: ${res.status}`);
  }
  return json.success === true;
}

/** Publish photo to Instagram Feed via Instagram Graph API */
export async function publishToInstagram(
  igUserId: string,
  accessToken: string,
  caption: string,
  imageUrl: string
): Promise<{ id: string }> {
  // Step 1: Create media container
  const containerUrl = new URL(`${META_GRAPH_BASE}/${igUserId}/media`);
  const containerBody = new URLSearchParams();
  containerBody.set("access_token", accessToken);
  containerBody.set("image_url", imageUrl);
  containerBody.set("caption", caption);
  const containerRes = await fetch(containerUrl.toString(), { method: "POST", body: containerBody });
  const containerJson = await containerRes.json() as Record<string, unknown>;
  if (!containerRes.ok || containerJson.error) {
    const err = containerJson.error as Record<string, string> | undefined;
    throw new Error(err?.message ?? `Instagram container error: ${containerRes.status}`);
  }
  const containerId = containerJson.id as string;

  // Step 2: Publish the container
  const publishUrl = new URL(`${META_GRAPH_BASE}/${igUserId}/media_publish`);
  const publishBody = new URLSearchParams();
  publishBody.set("access_token", accessToken);
  publishBody.set("creation_id", containerId);
  const publishRes = await fetch(publishUrl.toString(), { method: "POST", body: publishBody });
  const publishJson = await publishRes.json() as Record<string, unknown>;
  if (!publishRes.ok || publishJson.error) {
    const err = publishJson.error as Record<string, string> | undefined;
    throw new Error(err?.message ?? `Instagram publish error: ${publishRes.status}`);
  }
  return { id: publishJson.id as string };
}

/** Publish Reel to Instagram */
export async function publishInstagramReel(
  igUserId: string,
  accessToken: string,
  caption: string,
  videoUrl: string
): Promise<{ id: string }> {
  // Step 1: Create reel container
  const containerUrl = new URL(`${META_GRAPH_BASE}/${igUserId}/media`);
  const containerBody = new URLSearchParams();
  containerBody.set("access_token", accessToken);
  containerBody.set("media_type", "REELS");
  containerBody.set("video_url", videoUrl);
  containerBody.set("caption", caption);
  const containerRes = await fetch(containerUrl.toString(), { method: "POST", body: containerBody });
  const containerJson = await containerRes.json() as Record<string, unknown>;
  if (!containerRes.ok || containerJson.error) {
    const err = containerJson.error as Record<string, string> | undefined;
    throw new Error(err?.message ?? `Instagram Reel container error: ${containerRes.status}`);
  }
  const containerId = containerJson.id as string;

  // Step 2: Publish the reel
  const publishUrl = new URL(`${META_GRAPH_BASE}/${igUserId}/media_publish`);
  const publishBody = new URLSearchParams();
  publishBody.set("access_token", accessToken);
  publishBody.set("creation_id", containerId);
  const publishRes = await fetch(publishUrl.toString(), { method: "POST", body: publishBody });
  const publishJson = await publishRes.json() as Record<string, unknown>;
  if (!publishRes.ok || publishJson.error) {
    const err = publishJson.error as Record<string, string> | undefined;
    throw new Error(err?.message ?? `Instagram Reel publish error: ${publishRes.status}`);
  }
  return { id: publishJson.id as string };
}

/** Breakdown types supported by Meta Graph API */
export type BreakdownType = "age" | "gender" | "country" | "impression_device";

export interface MetaBreakdownInsight extends MetaInsight {
  age?: string;
  gender?: string;
  country?: string;
  impression_device?: string;
}

/** Get campaign insights broken down by a dimension (age, gender, country, device) */
export async function getCampaignBreakdown(
  campaignId: string,
  accessToken: string,
  breakdown: BreakdownType,
  datePreset = "last_30d"
): Promise<MetaBreakdownInsight[]> {
  const data = await metaGet<{ data: MetaBreakdownInsight[] }>(
    `${campaignId}/insights`,
    accessToken,
    {
      fields: "impressions,reach,clicks,spend,ctr,cpc,cpm",
      breakdowns: breakdown,
      date_preset: datePreset,
    }
  );
  return data.data ?? [];
}

// ─── Ad Sets ─────────────────────────────────────────────────────────────────
export interface MetaAdSet {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  bid_amount?: string;
  billing_event?: string;
  optimization_goal?: string;
  targeting?: {
    age_min?: number;
    age_max?: number;
    genders?: number[];
    geo_locations?: {
      countries?: string[];
      cities?: Array<{ key: string; name: string }>;
    };
    device_platforms?: string[];
    publisher_platforms?: string[];
    facebook_positions?: string[];
    instagram_positions?: string[];
    [key: string]: unknown;
  };
  start_time?: string;
  end_time?: string;
  created_time?: string;
}

/** Get ad sets for a campaign */
export async function getCampaignAdSets(
  campaignId: string,
  accessToken: string,
  limit = 25
): Promise<MetaAdSet[]> {
  const data = await metaGet<{ data: MetaAdSet[] }>(
    `${campaignId}/adsets`,
    accessToken,
    {
      fields: "id,name,status,effective_status,daily_budget,lifetime_budget,bid_amount,billing_event,optimization_goal,targeting,start_time,end_time,created_time",
      limit: String(limit),
    }
  );
  return data.data ?? [];
}

/** Get insights for ad sets of a campaign */
export async function getAdSetInsights(
  campaignId: string,
  accessToken: string,
  datePreset = "last_30d"
): Promise<MetaInsight[]> {
  const data = await metaGet<{ data: MetaInsight[] }>(
    `${campaignId}/insights`,
    accessToken,
    {
      level: "adset",
      fields: "adset_id,adset_name,impressions,reach,clicks,spend,ctr,cpc,cpm",
      date_preset: datePreset,
    }
  );
  return data.data ?? [];
}

// ─── Ads & Ad Creatives ──────────────────────────────────────────────────────
export interface MetaAd {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  creative?: {
    id: string;
    name?: string;
    title?: string;
    body?: string;
    image_url?: string;
    image_hash?: string;
    video_id?: string;
    thumbnail_url?: string;
    object_story_spec?: {
      page_id?: string;
      link_data?: {
        message?: string;
        link?: string;
        caption?: string;
        description?: string;
        image_hash?: string;
        picture?: string;
        call_to_action?: { type: string; value?: { link?: string } };
        child_attachments?: Array<{
          link?: string;
          image_hash?: string;
          picture?: string;
          name?: string;
          description?: string;
          video_id?: string;
        }>;
      };
      video_data?: {
        video_id?: string;
        image_url?: string;
        image_hash?: string;
        title?: string;
        message?: string;
        call_to_action?: { type: string; value?: { link?: string } };
      };
      photo_data?: {
        image_hash?: string;
        url?: string;
        caption?: string;
      };
    };
    effective_object_story_id?: string;
    asset_feed_spec?: {
      images?: Array<{ hash?: string; url?: string }>;
      videos?: Array<{ video_id?: string; thumbnail_url?: string }>;
      bodies?: Array<{ text?: string }>;
      titles?: Array<{ text?: string }>;
      descriptions?: Array<{ text?: string }>;
      call_to_action_types?: string[];
      link_urls?: Array<{ website_url?: string }>;
    };
  };
  adset_id?: string;
  created_time?: string;
}

export interface MetaAdCreativeDetail {
  id: string;
  name?: string;
  title?: string;
  body?: string;
  image_url?: string;
  thumbnail_url?: string;
  video_id?: string;
  object_story_spec?: NonNullable<MetaAd["creative"]>["object_story_spec"];
  effective_object_story_id?: string;
  asset_feed_spec?: NonNullable<MetaAd["creative"]>["asset_feed_spec"];
}

/** Get ads for a campaign with creative details */
export async function getCampaignAds(
  campaignId: string,
  accessToken: string,
  limit = 50
): Promise<MetaAd[]> {
  const data = await metaGet<{ data: MetaAd[] }>(
    `${campaignId}/ads`,
    accessToken,
    {
      fields: "id,name,status,effective_status,adset_id,created_time,creative{id,name,title,body,image_url,image_hash,thumbnail_url,video_id,object_story_spec{page_id,link_data{message,picture,image_hash,caption,description,link,call_to_action,child_attachments{picture,image_hash,name,description,link,video_id}},video_data{message,title,image_url,image_hash,video_id,call_to_action},photo_data{caption,url,image_hash}},effective_object_story_id,asset_feed_spec{images,videos,bodies,titles,descriptions,call_to_action_types,link_urls}}",
      limit: String(limit),
    }
  );
  return data.data ?? [];
}

/** Get ad insights for a campaign */
export async function getAdInsights(
  campaignId: string,
  accessToken: string,
  datePreset = "last_30d"
): Promise<MetaInsight[]> {
  const data = await metaGet<{ data: (MetaInsight & { ad_id?: string; ad_name?: string })[] }>(
    `${campaignId}/insights`,
    accessToken,
    {
      level: "ad",
      fields: "ad_id,ad_name,impressions,reach,clicks,spend,ctr,cpc,cpm",
      date_preset: datePreset,
    }
  );
  return data.data ?? [];
}

/** Batch-resolve image_hashes to full URLs via /{adAccountId}/adimages */
export async function getImageUrlsFromHashes(
  adAccountId: string,
  accessToken: string,
  hashes: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (hashes.length === 0) return result;
  try {
    // Meta allows up to 50 hashes per request
    const chunks: string[][] = [];
    for (let i = 0; i < hashes.length; i += 50) chunks.push(hashes.slice(i, i + 50));
    console.log(`[Meta] Resolving ${hashes.length} image hashes for account ${adAccountId}`);
    await Promise.all(chunks.map(async chunk => {
      const data = await metaGet<{ data: Array<{ hash?: string; url?: string; url_128?: string; permalink_url?: string }> }>(
        `${ensureActPrefix(adAccountId)}/adimages`,
        accessToken,
        { hashes: JSON.stringify(chunk), fields: "hash,url,url_128,permalink_url" }
      );
      console.log(`[Meta] adimages response: ${data.data?.length ?? 0} images resolved`);
      for (const img of data.data ?? []) {
        if (img.hash) {
          result.set(img.hash, img.url ?? img.permalink_url ?? img.url_128 ?? "");
        }
      }
    }));
  } catch (err) {
    console.error(`[Meta] getImageUrlsFromHashes error:`, err);
  }
  return result;
}

/** Get ad creative image/video preview URLs */
export async function getAdCreativePreviews(
  creativeId: string,
  accessToken: string,
  adFormat: string = "DESKTOP_FEED_STANDARD"
): Promise<string[]> {
  try {
    const data = await metaGet<{ data: Array<{ body?: string }> }>(
      `${creativeId}/previews`,
      accessToken,
      { ad_format: adFormat }
    );
    return (data.data ?? []).map(p => p.body ?? "").filter(Boolean);
  } catch {
    return [];
  }
}

/** Get image URL from image hash */
export async function getAdImage(
  adAccountId: string,
  accessToken: string,
  imageHash: string
): Promise<string | null> {
  try {
    const data = await metaGet<{ data: Array<{ url?: string; url_128?: string; permalink_url?: string }> }>(
      `${ensureActPrefix(adAccountId)}/adimages`,
      accessToken,
      { hashes: JSON.stringify([imageHash]) }
    );
    const img = data.data?.[0];
    return img?.url ?? img?.permalink_url ?? img?.url_128 ?? null;
  } catch {
    return null;
  }
}

/** Get Facebook Page info (name + picture) by page ID */
export async function getPageInfo(
  pageId: string,
  accessToken: string
): Promise<{ id: string; name: string; pictureUrl: string | null } | null> {
  try {
    const data = await metaGet<{ id?: string; name?: string; picture?: { data?: { url?: string } } }>(
      pageId,
      accessToken,
      { fields: "id,name,picture{url}" }
    );
    if (!data.id) return null;
    return {
      id: data.id,
      name: data.name ?? "",
      pictureUrl: data.picture?.data?.url ?? null,
    };
  } catch {
    return null;
  }
}

/** Get daily time-series insights for a campaign */
export async function getCampaignDailyInsights(
  campaignId: string,
  accessToken: string,
  datePreset = "last_30d"
): Promise<MetaInsight[]> {
  const data = await metaGet<{ data: MetaInsight[] }>(
    `${campaignId}/insights`,
    accessToken,
    {
      fields: "impressions,reach,clicks,spend,ctr,cpc,cpm",
      date_preset: datePreset,
      time_increment: "1",
    }
  );
  return data.data ?? [];
}

/**
 * Get video source URL from Meta Graph API.
 * Returns the direct MP4 source URL for a given video_id.
 * This requires the access token that has permission to access the video.
 */
export async function getVideoSource(
  videoId: string,
  accessToken: string
): Promise<string | null> {
  try {
    const data = await metaGet<{ source?: string; id?: string }>(
      videoId,
      accessToken,
      { fields: "source" }
    );
    return data.source ?? null;
  } catch {
    return null;
  }
}
