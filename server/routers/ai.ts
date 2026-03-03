/**
 * server/routers/ai.ts
 * tRPC router for AI-powered content generation.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";

const SYSTEM_PROMPTS: Record<string, string> = {
  copy: `You are an expert Meta Ads copywriter. Generate compelling, conversion-focused ad copy.
Be concise, impactful, and include a clear call-to-action. Format as:
**Headline:** ...
**Primary Text:** ...
**CTA:** ...`,

  audience: `You are a Meta Ads audience targeting expert. Help define precise audience segments.
Include demographics, interests, behaviors, and lookalike suggestions. Format as structured bullet points.`,

  creative: `You are a creative director for digital advertising. Write detailed creative briefs for ad campaigns.
Include visual concept, tone, messaging hierarchy, and format recommendations.`,

  strategy: `You are a senior digital marketing strategist specializing in Meta Ads.
Provide data-driven campaign strategies with budget allocation, bidding strategy, and KPI targets.`,

  hashtags: `You are a social media expert. Generate relevant, trending hashtags for the given content.
Return 10-15 hashtags sorted by relevance. Format as a space-separated list starting with #.`,

  caption: `You are a social media content writer. Write engaging captions for social media posts.
Match the brand voice, include emojis tastefully, and end with a call-to-action.`,
};

// Platform-specific caption tone guidance
const PLATFORM_TONE: Record<string, string> = {
  facebook:  "Write in a friendly, conversational tone suitable for Facebook. Can be slightly longer (2-3 paragraphs). Include a question to drive engagement.",
  instagram: "Write in a casual, visual-first tone for Instagram. Use line breaks for readability. Include 3-5 relevant emojis. End with a CTA.",
  twitter:   "Write a concise, punchy tweet under 250 characters. Be direct and impactful. Use 1-2 hashtags max.",
  linkedin:  "Write in a professional, thought-leadership tone for LinkedIn. 2-3 short paragraphs. Include industry insights.",
  tiktok:    "Write a short, energetic caption for TikTok. Use trending language, 3-5 hashtags, and a hook in the first line.",
  youtube:   "Write a YouTube video description. Include a hook, key points, and a subscribe CTA. SEO-friendly.",
  snapchat:  "Write a very short, fun Snapchat caption. Max 2 sentences. Use emojis.",
  pinterest: "Write a Pinterest description that is keyword-rich and inspirational. 1-2 sentences.",
};

export const aiRouter = router({
  generate: protectedProcedure
    .input(z.object({
      prompt: z.string().min(1),
      tool:   z.enum(["copy", "audience", "creative", "strategy", "hashtags", "caption"]),
    }))
    .mutation(async ({ input }) => {
      const systemPrompt = SYSTEM_PROMPTS[input.tool] ?? SYSTEM_PROMPTS.copy;
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: input.prompt },
        ],
      });
      const content = response?.choices?.[0]?.message?.content
        ?? "Unable to generate content. Please try again.";
      return { content };
    }),

  /** Generate a platform-aware caption for a post */
  generateCaption: protectedProcedure
    .input(z.object({
      topic:     z.string().min(1).max(500),
      platform:  z.string().default("facebook"),
      tone:      z.enum(["professional", "casual", "humorous", "inspirational"]).default("casual"),
      language:  z.enum(["en", "ar"]).default("en"),
    }))
    .mutation(async ({ input }) => {
      const platformTone = PLATFORM_TONE[input.platform] ?? PLATFORM_TONE.facebook;
      const langInstruction = input.language === "ar"
        ? "Write the caption in Arabic (العربية)."
        : "Write the caption in English.";

      const systemPrompt = `You are an expert social media content writer.
${platformTone}
Tone: ${input.tone}.
${langInstruction}
Return ONLY the caption text, no extra explanation.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: `Write a social media caption about: ${input.topic}` },
        ],
      });
      const raw = response?.choices?.[0]?.message?.content;
      const caption = (typeof raw === "string" ? raw.trim() : null)
        ?? "Unable to generate caption. Please try again.";
      return { caption };
    }),

  /** Generate hashtag suggestions for a post */
  generateHashtags: protectedProcedure
    .input(z.object({
      topic:    z.string().min(1).max(500),
      platform: z.string().default("instagram"),
      count:    z.number().int().min(5).max(30).default(15),
    }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a social media hashtag expert. Generate exactly ${input.count} relevant hashtags for ${input.platform}.
Return ONLY the hashtags as a space-separated list, each starting with #. No explanations.`,
          },
          {
            role: "user",
            content: `Generate hashtags for: ${input.topic}`,
          },
        ],
      });
      const rawContent = response?.choices?.[0]?.message?.content;
      const raw = typeof rawContent === "string" ? rawContent.trim() : "";
      // Parse hashtags from response
      const hashtags = raw
        .split(/\s+/)
        .filter((h: string) => h.startsWith("#"))
        .slice(0, input.count);
      return { hashtags };
    }),

  /** Analyze audience data and provide AI insights */
  analyzeAudience: protectedProcedure
    .input(z.object({
      platforms:     z.array(z.string()).default([]),
      totalPosts:    z.number().default(0),
      totalReach:    z.number().default(0),
      avgEngagement: z.number().default(0),
      topPlatform:   z.string().default(""),
      language:      z.enum(["en", "ar"]).default("en"),
    }))
    .mutation(async ({ input }) => {
      const langInstruction = input.language === "ar"
        ? "Respond in Arabic (العربية)."
        : "Respond in English.";

      const dataContext = `
Connected Platforms: ${input.platforms.join(", ") || "None"}
Total Posts Published: ${input.totalPosts}
Total Reach: ${input.totalReach.toLocaleString()}
Average Engagement Rate: ${input.avgEngagement.toFixed(2)}%
Top Performing Platform: ${input.topPlatform || "N/A"}
`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an expert social media analyst. Analyze the provided audience data and give actionable insights.
${langInstruction}
Structure your response with these sections:
1. **Audience Overview** — brief summary
2. **Key Strengths** — what's working well
3. **Growth Opportunities** — 3 specific recommendations
4. **Best Posting Times** — suggest optimal times based on platform
5. **Content Mix** — recommended content type ratio
Keep it concise and practical.`,
          },
          {
            role: "user",
            content: `Analyze this social media audience data:${dataContext}`,
          },
        ],
      });
      const rawAnalysis = response?.choices?.[0]?.message?.content;
      const analysis = (typeof rawAnalysis === "string" ? rawAnalysis.trim() : null)
        ?? "Unable to generate analysis. Please try again.";
      return { analysis };
    }),

  /** Improve existing post content */
  improveContent: protectedProcedure
    .input(z.object({
      content:  z.string().min(1).max(2000),
      platform: z.string().default("facebook"),
      goal:     z.enum(["engagement", "clarity", "shorter", "longer", "professional"]).default("engagement"),
    }))
    .mutation(async ({ input }) => {
      const goalMap: Record<string, string> = {
        engagement:   "Rewrite to maximize engagement (likes, comments, shares).",
        clarity:      "Rewrite for better clarity and readability.",
        shorter:      "Make it shorter and more concise while keeping the key message.",
        longer:       "Expand with more detail and context.",
        professional: "Rewrite in a more professional tone.",
      };

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a social media content editor. ${goalMap[input.goal]}
Platform: ${input.platform}. Return ONLY the improved text, no explanation.`,
          },
          { role: "user", content: input.content },
        ],
      });
      const rawImproved = response?.choices?.[0]?.message?.content;
      const improved = (typeof rawImproved === "string" ? rawImproved.trim() : null)
        ?? input.content;
      return { improved };
    }),
});
