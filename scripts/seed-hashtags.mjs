import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key);

// Updated posts with hashtags embedded in content
const updates = [
  { id: 1,  content: "Excited to share our latest product launch! Check it out now 🚀 #ProductLaunch #NewRelease #Innovation #Marketing #Brand" },
  { id: 2,  content: "Behind the scenes of our creative process. What do you think? 🎨 #BehindTheScenes #Creative #Design #ContentCreation #BTS" },
  { id: 3,  content: "Top 5 tips for growing your social media presence in 2026 📈 #SocialMedia #GrowthHacking #MarketingTips #DigitalMarketing #Tips" },
  { id: 4,  content: "Our team just hit a major milestone. Thank you for the support! 🎉 #Milestone #TeamWork #Grateful #Community #Achievement" },
  { id: 5,  content: "New tutorial: How to create stunning visuals for your brand 🎬 #Tutorial #DesignTips #Branding #VisualContent #HowTo" },
  { id: 6,  content: "Flash sale this weekend only! Don't miss out on amazing deals 🛍️ #FlashSale #Sale #Deals #Shopping #LimitedTime" },
  { id: 7,  content: "Customer spotlight: How @JaneDoe grew her business 3x with our platform 💼 #CustomerSuccess #CaseStudy #BusinessGrowth #Testimonial" },
  { id: 8,  content: "We're hiring! Join our growing team of passionate creators 👥 #Hiring #JobOpening #Careers #JoinOurTeam #Recruitment" },
  { id: 9,  content: "Happy Monday! Start your week with positive energy and big goals 💪 #MondayMotivation #Motivation #Mindset #Goals #Positivity" },
  { id: 10, content: "Introducing our new AI-powered analytics dashboard — smarter insights for your brand 🤖 #AI #Analytics #DataDriven #Innovation #Tech" },
];

let updated = 0;
for (const u of updates) {
  const { error } = await sb.from("posts").update({ content: u.content }).eq("id", u.id);
  if (error) console.error(`Error updating post ${u.id}:`, error.message);
  else { updated++; console.log(`✓ Updated post ${u.id}`); }
}

console.log(`\nDone — updated ${updated}/${updates.length} posts with hashtags`);
