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
  const json = await res.json() as Record<string, unknown>;
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
      fields: "id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time",
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
      fields: "campaign_id,campaign_name,impressions,reach,clicks,spend,ctr,cpc,cpm",
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
