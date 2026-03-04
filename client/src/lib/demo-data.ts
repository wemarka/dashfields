/**
 * Dashfields Demo Data
 * Shown when no real data is available to give new users a feel for the platform.
 * All values are clearly marked as "sample" in the UI.
 */

export const DEMO_CAMPAIGNS = [
  {
    id: "demo-1",
    name: "Summer Sale — Facebook",
    platform: "facebook",
    status: "ACTIVE" as const,
    objective: "CONVERSIONS",
    budget: 500,
    spend: 312.5,
    impressions: 48_200,
    clicks: 1_450,
    ctr: 3.01,
    cpc: 0.22,
    roas: 4.2,
    isDemo: true,
  },
  {
    id: "demo-2",
    name: "Brand Awareness — Instagram",
    platform: "instagram",
    status: "ACTIVE" as const,
    objective: "REACH",
    budget: 300,
    spend: 198.0,
    impressions: 72_000,
    clicks: 890,
    ctr: 1.24,
    cpc: 0.22,
    roas: 2.8,
    isDemo: true,
  },
  {
    id: "demo-3",
    name: "Product Launch — TikTok",
    platform: "tiktok",
    status: "PAUSED" as const,
    objective: "VIDEO_VIEWS",
    budget: 200,
    spend: 87.3,
    impressions: 31_500,
    clicks: 620,
    ctr: 1.97,
    cpc: 0.14,
    roas: 1.9,
    isDemo: true,
  },
];

export const DEMO_ANALYTICS = {
  totalSpend: 597.8,
  totalImpressions: 151_700,
  totalClicks: 2_960,
  avgCtr: 1.95,
  avgCpc: 0.2,
  avgRoas: 3.1,
  weeklySpend: [
    { day: "Mon", spend: 82 },
    { day: "Tue", spend: 95 },
    { day: "Wed", spend: 110 },
    { day: "Thu", spend: 88 },
    { day: "Fri", spend: 120 },
    { day: "Sat", spend: 65 },
    { day: "Sun", spend: 38 },
  ],
};

export const DEMO_POSTS = [
  {
    id: "demo-post-1",
    content: "🌟 Summer collection is here! Shop now and get 20% off your first order.",
    platforms: ["instagram", "facebook"],
    scheduledAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: "scheduled" as const,
    isDemo: true,
  },
  {
    id: "demo-post-2",
    content: "Behind the scenes of our latest photoshoot 📸 #BrandStory",
    platforms: ["instagram"],
    scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "scheduled" as const,
    isDemo: true,
  },
  {
    id: "demo-post-3",
    content: "Customer spotlight: See how @username transformed their business with us! 💼",
    platforms: ["facebook", "linkedin"],
    scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: "draft" as const,
    isDemo: true,
  },
  {
    id: "demo-post-4",
    content: "New blog post: 5 tips to boost your social media engagement in 2025 🚀",
    platforms: ["twitter", "linkedin"],
    scheduledAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: "scheduled" as const,
    isDemo: true,
  },
  {
    id: "demo-post-5",
    content: "Flash sale ends tonight! Use code SAVE30 for 30% off everything. ⏰",
    platforms: ["instagram", "facebook", "twitter"],
    scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: "scheduled" as const,
    isDemo: true,
  },
];

export const DEMO_ALERTS = [
  {
    id: "demo-alert-1",
    metric: "roas" as const,
    operator: "below" as const,
    threshold: 2.0,
    platform: "all",
    isDemo: true,
  },
  {
    id: "demo-alert-2",
    metric: "cpc" as const,
    operator: "above" as const,
    threshold: 1.5,
    platform: "facebook",
    isDemo: true,
  },
];

export const DEMO_ACTIVITY = [
  { id: "a1", type: "campaign_started", message: "Summer Sale campaign went live", time: "2h ago", isDemo: true },
  { id: "a2", type: "alert_triggered", message: "ROAS dropped below 2.0 on Instagram", time: "5h ago", isDemo: true },
  { id: "a3", type: "post_published", message: "Brand Awareness post published successfully", time: "1d ago", isDemo: true },
];
