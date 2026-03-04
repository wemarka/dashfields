/**
 * demoData.ts
 * Sample data used when Demo Mode is active.
 * Provides realistic-looking analytics, campaigns, and posts data.
 */

export const DEMO_CAMPAIGNS = [
  {
    id: 1, name: "Summer Sale 2025", platform: "facebook", status: "active",
    budget: 5000, spend: 3240.50, impressions: 284000, clicks: 8520,
    ctr: 3.0, roas: 4.2, startDate: "2025-06-01", endDate: "2025-08-31",
  },
  {
    id: 2, name: "Brand Awareness Q3", platform: "instagram", status: "active",
    budget: 3000, spend: 1850.00, impressions: 192000, clicks: 5760,
    ctr: 3.0, roas: 3.8, startDate: "2025-07-01", endDate: "2025-09-30",
  },
  {
    id: 3, name: "Product Launch - Pro Plan", platform: "linkedin", status: "active",
    budget: 8000, spend: 6100.00, impressions: 95000, clicks: 4750,
    ctr: 5.0, roas: 6.1, startDate: "2025-07-15", endDate: "2025-10-15",
  },
  {
    id: 4, name: "Retargeting - Website Visitors", platform: "facebook", status: "paused",
    budget: 2000, spend: 1200.00, impressions: 48000, clicks: 2400,
    ctr: 5.0, roas: 5.5, startDate: "2025-05-01", endDate: "2025-12-31",
  },
  {
    id: 5, name: "TikTok Viral Challenge", platform: "tiktok", status: "ended",
    budget: 1500, spend: 1500.00, impressions: 520000, clicks: 15600,
    ctr: 3.0, roas: 2.9, startDate: "2025-04-01", endDate: "2025-04-30",
  },
];

export const DEMO_ANALYTICS = {
  totalSpend: 13890.50,
  totalImpressions: 1139000,
  totalClicks: 37030,
  avgCtr: 3.25,
  avgRoas: 4.5,
  avgCpc: 0.375,
  reach: 890000,
  engagements: 52400,
  trend: {
    spend: +12.4,
    impressions: +8.7,
    clicks: +15.2,
    ctr: +0.3,
    roas: +0.8,
  },
  timeSeries: Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
      date: date.toISOString().slice(0, 10),
      spend: Math.round(350 + Math.random() * 250),
      impressions: Math.round(28000 + Math.random() * 15000),
      clicks: Math.round(800 + Math.random() * 600),
      roas: +(3.5 + Math.random() * 2).toFixed(2),
    };
  }),
  platforms: [
    { platform: "facebook",  spend: 6440, impressions: 332000, clicks: 10920, roas: 4.8 },
    { platform: "instagram", spend: 3850, impressions: 192000, clicks: 5760,  roas: 3.8 },
    { platform: "linkedin",  spend: 6100, impressions: 95000,  clicks: 4750,  roas: 6.1 },
    { platform: "tiktok",    spend: 1500, impressions: 520000, clicks: 15600, roas: 2.9 },
  ],
};

export const DEMO_POSTS = [
  {
    id: 1, platform: "instagram", content: "🚀 Exciting news! Our new Pro Plan is here with advanced AI analytics. Try it free for 30 days! #SocialMedia #Marketing #AI",
    status: "published", scheduledAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    likes: 1243, comments: 87, shares: 156, reach: 24500,
  },
  {
    id: 2, platform: "facebook", content: "Did you know that businesses using Dashfields see an average 40% improvement in ad performance? Here's how our AI-powered insights make the difference...",
    status: "scheduled", scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    likes: 0, comments: 0, shares: 0, reach: 0,
  },
  {
    id: 3, platform: "linkedin", content: "Proud to announce that Dashfields has been recognized as a top Social Media Management tool for 2025! Thank you to our amazing community of 10,000+ marketers who trust us every day. 🙏",
    status: "published", scheduledAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    likes: 892, comments: 134, shares: 67, reach: 18900,
  },
  {
    id: 4, platform: "twitter", content: "Hot take: Most social media managers spend 60% of their time on reporting. With Dashfields, that drops to 10%. The other 50%? Actually creating great content. 🎯 #MarketingTips",
    status: "published", scheduledAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    likes: 2341, comments: 198, shares: 445, reach: 89000,
  },
  {
    id: 5, platform: "tiktok", content: "POV: You just discovered Dashfields and now you manage 5 social accounts in 30 minutes a day 😮‍💨✨ #SocialMediaTips #MarketingHacks #Dashfields",
    status: "draft", scheduledAt: null,
    likes: 0, comments: 0, shares: 0, reach: 0,
  },
];

export const DEMO_AUDIENCE = {
  totalFollowers: 48200,
  followerGrowth: +5.8,
  engagementRate: 4.2,
  avgReach: 24500,
  demographics: {
    age: [
      { group: "18-24", pct: 28 },
      { group: "25-34", pct: 42 },
      { group: "35-44", pct: 18 },
      { group: "45-54", pct: 8 },
      { group: "55+",   pct: 4 },
    ],
    gender: [{ name: "Female", pct: 58 }, { name: "Male", pct: 40 }, { name: "Other", pct: 2 }],
    topCountries: [
      { country: "Jordan", pct: 45 },
      { country: "Saudi Arabia", pct: 22 },
      { country: "UAE", pct: 15 },
      { country: "Egypt", pct: 10 },
      { country: "Other", pct: 8 },
    ],
  },
};

export const DEMO_ACCOUNTS = [
  { id: 1, platform: "facebook",  name: "Dashfields Official", username: "dashfields", followers: 18400, is_active: true },
  { id: 2, platform: "instagram", name: "Dashfields",          username: "dashfields", followers: 22100, is_active: true },
  { id: 3, platform: "linkedin",  name: "Dashfields Inc.",     username: "dashfields", followers: 5200,  is_active: true },
  { id: 4, platform: "twitter",   name: "Dashfields",          username: "dashfields", followers: 2500,  is_active: true },
];
