/**
 * Meta (Facebook + Instagram) Graph API response types.
 * Based on Meta Graph API v19.0 documentation.
 */

// ─── Common ───────────────────────────────────────────────────────────────────

export interface MetaApiError {
  message: string;
  type: string;
  code: number;
  fbtrace_id?: string;
}

export interface MetaApiErrorResponse {
  error: MetaApiError;
}

export interface MetaPagingCursors {
  before: string;
  after: string;
}

export interface MetaPaging {
  cursors?: MetaPagingCursors;
  next?: string;
  previous?: string;
}

export interface MetaListResponse<T> {
  data: T[];
  paging?: MetaPaging;
  error?: MetaApiError;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface MetaUserPicture {
  data?: {
    url?: string;
    width?: number;
    height?: number;
    is_silhouette?: boolean;
  };
}

export interface MetaUser {
  id: string;
  name: string;
  picture?: MetaUserPicture;
  email?: string;
}

// ─── Ad Accounts ──────────────────────────────────────────────────────────────

export type MetaAdAccountStatus = 1 | 2 | 3 | 7 | 8 | 9 | 100 | 101 | 201;

export interface MetaAdAccount {
  id: string;
  name: string;
  account_status: MetaAdAccountStatus;
  currency: string;
  timezone_name?: string;
  spend_cap?: string;
  amount_spent?: string;
}

export interface MetaAdAccountsResponse extends MetaListResponse<MetaAdAccount> {}

// ─── Facebook Pages ───────────────────────────────────────────────────────────

export interface MetaInstagramBusinessAccount {
  id: string;
  name?: string;
  username?: string;
  profile_picture_url?: string;
  followers_count?: number;
  media_count?: number;
  biography?: string;
  website?: string;
}

export interface MetaFacebookPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  fan_count?: number;
  instagram_business_account?: MetaInstagramBusinessAccount;
}

export interface MetaFacebookPagesResponse extends MetaListResponse<MetaFacebookPage> {}

// ─── Token Exchange ───────────────────────────────────────────────────────────

export interface MetaTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  error?: MetaApiError;
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export type MetaCampaignStatus = "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED";
export type MetaCampaignObjective =
  | "AWARENESS"
  | "TRAFFIC"
  | "ENGAGEMENT"
  | "LEADS"
  | "APP_PROMOTION"
  | "SALES"
  | "OUTCOME_AWARENESS"
  | "OUTCOME_ENGAGEMENT"
  | "OUTCOME_LEADS"
  | "OUTCOME_SALES"
  | "OUTCOME_TRAFFIC"
  | "OUTCOME_APP_PROMOTION";

export interface MetaCampaign {
  id: string;
  name: string;
  status: MetaCampaignStatus;
  objective: MetaCampaignObjective;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
  created_time?: string;
  updated_time?: string;
}

export interface MetaCampaignsResponse extends MetaListResponse<MetaCampaign> {}

// ─── Insights ─────────────────────────────────────────────────────────────────

export interface MetaActionValue {
  action_type: string;
  value: string;
}

export interface MetaInsight {
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  date_start?: string;
  date_stop?: string;
  impressions?: string;
  clicks?: string;
  spend?: string;
  reach?: string;
  frequency?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  cpp?: string;
  actions?: MetaActionValue[];
  conversions?: MetaActionValue[];
  cost_per_action_type?: MetaActionValue[];
  video_p25_watched_actions?: MetaActionValue[];
  video_p50_watched_actions?: MetaActionValue[];
  video_p75_watched_actions?: MetaActionValue[];
  video_p100_watched_actions?: MetaActionValue[];
}

export interface MetaInsightsResponse extends MetaListResponse<MetaInsight> {}

// ─── Date Presets ─────────────────────────────────────────────────────────────

export type MetaDatePreset =
  | "today"
  | "yesterday"
  | "this_week_mon_today"
  | "this_week_sun_today"
  | "last_week_mon_sun"
  | "last_week_sun_sat"
  | "last_3d"
  | "last_7d"
  | "last_14d"
  | "last_28d"
  | "last_30d"
  | "last_90d"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "last_quarter"
  | "this_year"
  | "last_year"
  | "maximum";
