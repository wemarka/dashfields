/**
 * server/db/campaigns.ts
 * Campaign-related database query helpers using Supabase client.
 */
import { getSupabase } from "../supabase";

export type CampaignRow = {
  id: number;
  user_id: number;
  social_account_id: number | null;
  name: string;
  platform: string;
  status: string;
  objective: string | null;
  budget: string | null;
  budget_type: string | null;
  start_date: string | null;
  end_date: string | null;
  platform_campaign_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type MetricRow = {
  id: number;
  campaign_id: number;
  date: string;
  impressions: number | null;
  clicks: number | null;
  spend: string | null;
  reach: number | null;
  conversions: number | null;
  revenue: string | null;
  cpc: string | null;
  cpm: string | null;
  ctr: string | null;
  roas: string | null;
  created_at: string;
};

export async function getUserCampaigns(userId: number, workspaceId?: number): Promise<CampaignRow[]> {
  const sb = getSupabase();
  let query = sb
    .from("campaigns")
    .select("*")
    .eq("user_id", userId);
  if (workspaceId) query = query.eq("workspace_id", workspaceId);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CampaignRow[];
}

export async function getCampaignById(campaignId: number, userId: number): Promise<CampaignRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as CampaignRow | null;
}

export async function createCampaign(campaign: {
  userId: number;
  name: string;
  platform: string;
  status?: string;
  objective?: string | null;
  budget?: string | null;
  budgetType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  socialAccountId?: number | null;
  platformCampaignId?: string | null;
  metadata?: Record<string, unknown> | null;
  workspaceId?: number | null;
}): Promise<CampaignRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("campaigns")
    .insert({
      user_id:              campaign.userId,
      name:                 campaign.name,
      platform:             campaign.platform,
      status:               campaign.status ?? "draft",
      objective:            campaign.objective ?? null,
      budget:               campaign.budget ?? null,
      budget_type:          campaign.budgetType ?? null,
      start_date:           campaign.startDate ?? null,
      end_date:             campaign.endDate ?? null,
      social_account_id:    campaign.socialAccountId ?? null,
      platform_campaign_id: campaign.platformCampaignId ?? null,
      metadata:             campaign.metadata ?? null,
      workspace_id:         campaign.workspaceId ?? null,
    } as any)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as CampaignRow | null;
}

export async function updateCampaignStatus(
  campaignId: number,
  userId: number,
  status: string
): Promise<CampaignRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("campaigns")
    .update({ status, updated_at: new Date().toISOString() } as any)
    .eq("id", campaignId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as CampaignRow | null;
}

export async function deleteCampaign(id: number, userId: number): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("campaigns")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function getCampaignMetrics(
  campaignId: number,
  days = 7
): Promise<MetricRow[]> {
  const sb = getSupabase();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const { data, error } = await sb
    .from("campaign_metrics")
    .select("*")
    .eq("campaign_id", campaignId)
    .gte("date", since)
    .order("date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MetricRow[];
}

export async function upsertCampaignMetric(metric: {
  campaignId: number;
  date: string;
  impressions?: number;
  clicks?: number;
  spend?: string;
  reach?: number;
  conversions?: number;
  revenue?: string;
  cpc?: string;
  cpm?: string;
  ctr?: string;
  roas?: string;
}): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("campaign_metrics")
    .upsert({
      campaign_id: metric.campaignId,
      date:        metric.date,
      impressions: metric.impressions ?? null,
      clicks:      metric.clicks ?? null,
      spend:       metric.spend ?? null,
      reach:       metric.reach ?? null,
      conversions: metric.conversions ?? null,
      revenue:     metric.revenue ?? null,
      cpc:         metric.cpc ?? null,
      cpm:         metric.cpm ?? null,
      ctr:         metric.ctr ?? null,
      roas:        metric.roas ?? null,
    } as any, { onConflict: "campaign_id,date" });
  if (error) throw error;
}
