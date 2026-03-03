/**
 * seed-realistic.mjs
 * Adds realistic demo data to Supabase for Dashfields.
 * - Updates existing posts with hashtag-rich content
 * - Adds campaigns for YouTube and Twitter
 * - Adds campaign_metrics for new campaigns
 * - Adds social_connections for all platforms
 */
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const USER_ID = 1;

// ─── 1. Update posts with realistic content + hashtags ────────────────────────
const postUpdates = [
  { id: 11, content: "🚀 Discover our new Spring 2026 collection — crafted for those who demand excellence. Shop now and get 20% off your first order! #SpringSale #NewCollection #Fashion #ShopNow #Style2026", platforms: '["facebook"]', likes: 1240, comments: 186, shares: 94, reach: 28500, impressions: 41200 },
  { id: 12, content: "📸 Behind the scenes of our latest campaign shoot. Swipe to see the magic happen! ✨ #BTS #ContentCreation #BrandPhotography #Instagram #Creative", platforms: '["instagram"]', likes: 2180, comments: 342, shares: 156, reach: 34800, impressions: 52100 },
  { id: 13, content: "Customer spotlight: How @user transformed their workflow with our tools 💪 Watch the full story! #CustomerSuccess #TikTok #Viral #Trending #BusinessGrowth", platforms: '["tiktok"]', likes: 8900, comments: 1240, shares: 2100, reach: 125000, impressions: 198000 },
  { id: 14, content: "🎯 Limited time offer: 30% off all premium plans. Use code SPRING30 at checkout. Offer ends March 15! #LinkedInMarketing #B2B #SaaS #DigitalMarketing #Offer", platforms: '["linkedin"]', likes: 420, comments: 88, shares: 65, reach: 12400, impressions: 18600 },
  { id: 15, content: "We just hit 10K followers! 🎉 Thank you for being part of this journey. RT to celebrate with us! #Milestone #10K #ThankYou #Community #Twitter", platforms: '["twitter"]', likes: 3200, comments: 890, shares: 1450, reach: 45000, impressions: 78000 },
  { id: 16, content: "Top 5 tips to maximize your social media ROI in 2026 👇 Thread 🧵 #SocialMediaMarketing #ROI #DigitalStrategy #Marketing2026 #GrowthHacking", platforms: '["facebook"]', likes: 980, comments: 234, shares: 178, reach: 22100, impressions: 35400 },
  { id: 17, content: "New feature alert: Introducing AI-powered content scheduling 🤖✨ Plan a month of content in minutes! #AI #ContentMarketing #Automation #ProductUpdate #Tech", platforms: '["instagram"]', likes: 1890, comments: 267, shares: 134, reach: 31200, impressions: 47800 },
  { id: 18, content: "Join us LIVE tomorrow at 3PM for a Q&A session with our CEO 🎙️ Drop your questions below! #LiveStream #QandA #CEO #Community #AskMeAnything", platforms: '["tiktok"]', likes: 5600, comments: 2100, shares: 890, reach: 89000, impressions: 142000 },
  { id: 19, content: "Case study: How we helped a brand grow their engagement by 340% in 90 days 📈 Full breakdown in the link. #CaseStudy #LinkedIn #Marketing #Results #DataDriven", platforms: '["linkedin"]', likes: 560, comments: 124, shares: 89, reach: 15800, impressions: 24200 },
  { id: 20, content: "Weekend vibes 🌟 What are you working on this weekend? Drop it below! #WeekendMotivation #Entrepreneur #Hustle #BuildInPublic #Startup", platforms: '["twitter"]', likes: 1240, comments: 456, shares: 678, reach: 28900, impressions: 51000 },
  { id: 21, content: "📖 Our latest blog post: The future of social media marketing in 2026. Read now! #ContentMarketing #Blog #SocialMedia #Trends2026 #DigitalMarketing", platforms: '["facebook"]', likes: 740, comments: 98, shares: 67, reach: 18400, impressions: 28900 },
  { id: 22, content: "⚡ Flash sale starts NOW! 48 hours only — grab your favorites before they're gone! Use code FLASH48 🛍️ #FlashSale #Instagram #Shopping #Sale #LimitedTime", platforms: '["instagram"]', likes: 3400, comments: 567, shares: 289, reach: 52000, impressions: 84000 },
  { id: 23, content: "Introducing our ambassador program 🌟 Apply now and earn while you create! Link in bio. #Ambassador #Creator #Influencer #TikTok #EarnMoney", platforms: '["tiktok"]', likes: 12400, comments: 3200, shares: 4500, reach: 189000, impressions: 312000 },
  { id: 24, content: "Throwback to our first office 🏢 Look how far we have come! From 3 people to 50+ team members. #TBT #Startup #Growth #TeamWork #Milestone", platforms: '["linkedin"]', likes: 890, comments: 145, shares: 112, reach: 21400, impressions: 32800 },
  { id: 25, content: "Pro tip: Consistency beats perfection. Post daily, engage authentically, and watch your audience grow 📊 #ProTip #SocialMediaTips #Growth #Twitter #Marketing", platforms: '["twitter"]', likes: 2100, comments: 678, shares: 934, reach: 38900, impressions: 67000 },
  { id: 1,  content: "🎉 Excited to share our latest product launch! Check it out now — link in bio. #ProductLaunch #NewProduct #Instagram #Excited #Innovation", platforms: '["instagram"]', likes: 1560, comments: 234, shares: 98, reach: 26800, impressions: 41200 },
  { id: 2,  content: "Behind the scenes of our creative process 🎨 What do you think? #BTS #Creative #Facebook #Design #Process", platforms: '["facebook"]', likes: 890, comments: 167, shares: 78, reach: 19800, impressions: 31400 },
  { id: 3,  content: "Top 5 tips for growing your social media presence in 2026 📈 #SocialMedia #GrowthTips #TikTok #Viral #Marketing", platforms: '["tiktok"]', likes: 6700, comments: 1890, shares: 2340, reach: 98000, impressions: 156000 },
  { id: 6,  content: "🔥 Flash sale this weekend only! Don't miss out on amazing deals. Use code WEEKEND20 #Sale #Weekend #Facebook #Deals #Shopping", platforms: '["facebook"]', likes: 1120, comments: 289, shares: 156, reach: 24600, impressions: 38900 },
  { id: 7,  content: "Customer spotlight: How @JaneDoe grew her business 3x with our platform 🚀 #CustomerSuccess #TikTok #BusinessGrowth #Success #Entrepreneur", platforms: '["tiktok"]', likes: 9800, comments: 2340, shares: 3100, reach: 145000, impressions: 234000 },
  { id: 8,  content: "We're hiring! Join our growing team of passionate creators 🌟 Apply via link in bio. #Hiring #Jobs #LinkedIn #Careers #TeamBuilding", platforms: '["linkedin"]', likes: 340, comments: 89, shares: 56, reach: 9800, impressions: 15600 },
];

console.log('Updating posts with hashtag-rich content...');
for (const p of postUpdates) {
  const { error } = await sb.from('posts').update({
    content: p.content,
    platforms: p.platforms,
    likes: p.likes,
    comments: p.comments,
    shares: p.shares,
    reach: p.reach,
    impressions: p.impressions,
  }).eq('id', p.id).eq('user_id', USER_ID);
  if (error) console.error('Post update error:', p.id, error.message);
}
console.log('Posts updated:', postUpdates.length);

// ─── 2. Add YouTube and Twitter campaigns ────────────────────────────────────
const now = new Date();
const startDate = new Date(now.getTime() - 60 * 86400000).toISOString().split('T')[0];
const endDate   = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];

const newCampaigns = [
  { user_id: USER_ID, name: "YouTube Pre-Roll Q1", platform: "youtube", status: "active", objective: "video_views", budget: 3200, budget_type: "lifetime", start_date: startDate, end_date: endDate },
  { user_id: USER_ID, name: "Twitter Engagement Drive", platform: "twitter", status: "active", objective: "engagement", budget: 1500, budget_type: "lifetime", start_date: startDate, end_date: endDate },
  { user_id: USER_ID, name: "Snapchat Stories Campaign", platform: "snapchat", status: "paused", objective: "reach", budget: 900, budget_type: "lifetime", start_date: startDate, end_date: endDate },
];

const { data: insertedCampaigns, error: campErr } = await sb.from('campaigns').insert(newCampaigns).select('id,platform');
if (campErr) {
  console.error('Campaign insert error:', campErr.message);
} else {
  console.log('New campaigns added:', insertedCampaigns.length);

  // ─── 3. Add campaign_metrics for new campaigns ───────────────────────────────
  const metricsToInsert = [];
  for (const camp of insertedCampaigns) {
    for (let d = 0; d < 30; d++) {
      const date = new Date(now.getTime() - d * 86400000).toISOString().split('T')[0];
      const baseImpressions = camp.platform === 'youtube' ? 4200 + d * 80 : camp.platform === 'twitter' ? 3100 + d * 60 : 1800 + d * 40;
      const clicks = Math.round(baseImpressions * (camp.platform === 'youtube' ? 0.0065 : camp.platform === 'twitter' ? 0.0086 : 0.005));
      const spend = Math.round(baseImpressions * (camp.platform === 'youtube' ? 0.0032 : camp.platform === 'twitter' ? 0.0038 : 0.0025) * 100) / 100;
      const conversions = Math.round(clicks * 0.024);
      const ctr = Math.round((clicks / baseImpressions) * 10000) / 100;
      const cpc = clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0;
      const cpm = Math.round((spend / baseImpressions) * 1000 * 100) / 100;
      const roas = spend > 0 && conversions > 0 ? Math.round((conversions * 45) / spend * 100) / 100 : 0;
      metricsToInsert.push({
        campaign_id: camp.id,
        date,
        impressions: baseImpressions,
        clicks,
        spend,
        reach: Math.round(baseImpressions * 0.75),
        conversions,
        revenue: conversions * 45,
        ctr,
        cpc,
        cpm,
        roas,
      });
    }
  }

  const { error: metErr } = await sb.from('campaign_metrics').insert(metricsToInsert);
  if (metErr) console.error('Metrics insert error:', metErr.message);
  else console.log('New metrics added:', metricsToInsert.length);
}

// ─── 4. Add social_connections ───────────────────────────────────────────────
const { count: connCount } = await sb.from('social_connections').select('*', { count: 'exact', head: true });
if (connCount === 0) {
  const connections = [
    { user_id: USER_ID, platform: 'facebook',  account_name: 'Abd-Maya Official',    account_id: 'fb_123456',   status: 'connected', followers: 48200, access_token: 'mock_token_fb',  token_expires_at: new Date(Date.now() + 60*86400000).toISOString() },
    { user_id: USER_ID, platform: 'instagram', account_name: '@abdmaya',             account_id: 'ig_789012',   status: 'connected', followers: 32100, access_token: 'mock_token_ig',  token_expires_at: new Date(Date.now() + 60*86400000).toISOString() },
    { user_id: USER_ID, platform: 'tiktok',    account_name: '@abdmaya_official',    account_id: 'tt_345678',   status: 'connected', followers: 89400, access_token: 'mock_token_tt',  token_expires_at: new Date(Date.now() + 30*86400000).toISOString() },
    { user_id: USER_ID, platform: 'linkedin',  account_name: 'Abd-Maya Company',     account_id: 'li_901234',   status: 'connected', followers: 12800, access_token: 'mock_token_li',  token_expires_at: new Date(Date.now() + 90*86400000).toISOString() },
    { user_id: USER_ID, platform: 'twitter',   account_name: '@abdmaya',             account_id: 'tw_567890',   status: 'connected', followers: 21600, access_token: 'mock_token_tw',  token_expires_at: new Date(Date.now() + 45*86400000).toISOString() },
    { user_id: USER_ID, platform: 'youtube',   account_name: 'Abd-Maya Channel',     account_id: 'yt_234567',   status: 'connected', followers: 15300, access_token: 'mock_token_yt',  token_expires_at: new Date(Date.now() + 60*86400000).toISOString() },
    { user_id: USER_ID, platform: 'snapchat',  account_name: 'abdmaya_snap',         account_id: 'sc_678901',   status: 'expired',   followers: 8900,  access_token: 'mock_token_sc',  token_expires_at: new Date(Date.now() - 5*86400000).toISOString() },
  ];

  const { error: connErr } = await sb.from('social_connections').insert(connections);
  if (connErr) console.error('Connections error:', connErr.message);
  else console.log('Social connections added:', connections.length);
} else {
  console.log('Social connections already exist:', connCount);
}

// ─── 5. Final summary ────────────────────────────────────────────────────────
const { count: postsCount }    = await sb.from('posts').select('*', { count: 'exact', head: true });
const { count: campsCount }    = await sb.from('campaigns').select('*', { count: 'exact', head: true });
const { count: metricsCount }  = await sb.from('campaign_metrics').select('*', { count: 'exact', head: true });
const { count: connsCount }    = await sb.from('social_connections').select('*', { count: 'exact', head: true });

console.log('\n=== FINAL DATABASE STATE ===');
console.log('posts:', postsCount);
console.log('campaigns:', campsCount);
console.log('campaign_metrics:', metricsCount);
console.log('social_connections:', connsCount);
