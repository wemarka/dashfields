/**
 * Meta Graph API helper
 * Calls Meta Marketing API using a stored user access token.
 */

const META_GRAPH_BASE = "https://graph.facebook.com/v19.0";

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
    const err = json.error as Record<string, string> | undefined;
    throw new Error(err?.message ?? `Meta API error: ${res.status}`);
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

/** Get campaigns for an ad account */
export async function getMetaCampaigns(
  adAccountId: string,
  accessToken: string,
  limit = 25
): Promise<MetaCampaign[]> {
  const data = await metaGet<{ data: MetaCampaign[] }>(
    `${adAccountId}/campaigns`,
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
    `${adAccountId}/insights`,
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
    `${adAccountId}/insights`,
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
