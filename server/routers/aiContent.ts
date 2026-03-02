/**
 * server/routers/aiContent.ts
 * AI-powered content suggestions using the built-in LLM helper.
 * Generates post ideas, captions, hashtags, and caption length optimization.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getSupabase } from "../supabase";

// ─── Types ─────────────────────────────────────────────────────────────────────
const PLATFORM_HINTS: Record<string, string> = {
  facebook:  "Facebook (2-3 paragraphs, conversational, can include links, max 500 chars for best reach)",
  instagram: "Instagram (short punchy caption, 3-5 relevant hashtags, emoji-friendly, max 150 chars)",
  tiktok:    "TikTok (ultra-short hook, trending language, 3 hashtags, max 100 chars)",
  twitter:   "Twitter/X (concise, max 280 chars, 1-2 hashtags, punchy)",
  linkedin:  "LinkedIn (professional tone, thought leadership, 2-3 paragraphs, 3 relevant hashtags)",
  youtube:   "YouTube (engaging description, SEO-friendly, include keywords, 200-300 chars)",
  snapchat:  "Snapchat (very short, fun, emoji-heavy, max 80 chars)",
  pinterest: "Pinterest (descriptive, keyword-rich, inspirational, max 200 chars)",
};

const TONE_HINTS: Record<string, string> = {
  professional: "professional and authoritative",
  casual:       "casual, friendly, and conversational",
  funny:        "humorous, witty, and entertaining",
  inspirational: "motivational, uplifting, and inspiring",
  educational:  "informative, clear, and educational",
  promotional:  "persuasive, benefit-focused, and action-oriented",
};

// ─── Router ────────────────────────────────────────────────────────────────────
export const aiContentRouter = router({
  /** Generate post ideas and captions */
  generate: protectedProcedure
    .input(z.object({
      topic:     z.string().min(2).max(500),
      platform:  z.string().default("instagram"),
      tone:      z.enum(["professional", "casual", "funny", "inspirational", "educational", "promotional"]).default("casual"),
      count:     z.number().min(1).max(5).default(3),
      industry:  z.string().optional(),
      targetAudience: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const platformHint = PLATFORM_HINTS[input.platform] ?? input.platform;
      const toneHint     = TONE_HINTS[input.tone] ?? input.tone;

      const systemPrompt = `You are an expert social media content strategist specializing in ${platformHint}.
Your task is to generate engaging, platform-optimized social media content.
Always respond with valid JSON only — no markdown, no explanation.`;

      const userPrompt = `Generate ${input.count} unique social media post ideas for the following:

Topic: ${input.topic}
Platform: ${platformHint}
Tone: ${toneHint}
${input.industry ? `Industry: ${input.industry}` : ""}
${input.targetAudience ? `Target Audience: ${input.targetAudience}` : ""}

Return a JSON object with this exact structure:
{
  "ideas": [
    {
      "title": "short descriptive title",
      "caption": "the full post caption optimized for the platform",
      "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
      "hook": "attention-grabbing first line",
      "cta": "call to action",
      "estimatedEngagement": "low|medium|high",
      "bestTime": "best time to post (e.g., Tuesday 7pm)"
    }
  ]
}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "content_ideas",
            strict: true,
            schema: {
              type: "object",
              properties: {
                ideas: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title:               { type: "string" },
                      caption:             { type: "string" },
                      hashtags:            { type: "array", items: { type: "string" } },
                      hook:                { type: "string" },
                      cta:                 { type: "string" },
                      estimatedEngagement: { type: "string" },
                      bestTime:            { type: "string" },
                    },
                    required: ["title", "caption", "hashtags", "hook", "cta", "estimatedEngagement", "bestTime"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["ideas"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = response.choices?.[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : null;
      if (!content) throw new Error("LLM returned empty response");

      const parsed = JSON.parse(content) as { ideas: unknown[] };
      return { ideas: parsed.ideas, platform: input.platform, tone: input.tone };
    }),

  /** Optimize caption length for a specific platform */
  optimizeCaption: protectedProcedure
    .input(z.object({
      caption:  z.string().min(1).max(5000),
      platform: z.string().default("instagram"),
    }))
    .mutation(async ({ input }) => {
      const platformHint = PLATFORM_HINTS[input.platform] ?? input.platform;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a social media copywriter. Optimize captions for ${platformHint}. Respond with JSON only.`,
          },
          {
            role: "user",
            content: `Optimize this caption for ${input.platform}:\n\n"${input.caption}"\n\nReturn JSON: { "optimized": "...", "changes": "brief explanation", "charCount": number }`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "optimized_caption",
            strict: true,
            schema: {
              type: "object",
              properties: {
                optimized: { type: "string" },
                changes:   { type: "string" },
                charCount: { type: "number" },
              },
              required: ["optimized", "changes", "charCount"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent2 = response.choices?.[0]?.message?.content;
      const content = typeof rawContent2 === "string" ? rawContent2 : null;
      if (!content) throw new Error("LLM returned empty response");
      return JSON.parse(content) as { optimized: string; changes: string; charCount: number };
    }),

  /** Generate hashtag suggestions */
  hashtags: protectedProcedure
    .input(z.object({
      topic:    z.string().min(2).max(300),
      platform: z.string().default("instagram"),
      count:    z.number().min(5).max(30).default(15),
    }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a hashtag research expert for ${input.platform}. Respond with JSON only.`,
          },
          {
            role: "user",
            content: `Generate ${input.count} relevant hashtags for this topic on ${input.platform}: "${input.topic}"\n\nReturn JSON: { "hashtags": [{ "tag": "#example", "popularity": "high|medium|low", "category": "niche|broad|trending" }] }`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "hashtag_suggestions",
            strict: true,
            schema: {
              type: "object",
              properties: {
                hashtags: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      tag:        { type: "string" },
                      popularity: { type: "string" },
                      category:   { type: "string" },
                    },
                    required: ["tag", "popularity", "category"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["hashtags"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent3 = response.choices?.[0]?.message?.content;
      const content = typeof rawContent3 === "string" ? rawContent3 : null;
      if (!content) throw new Error("LLM returned empty response");
      return JSON.parse(content) as { hashtags: { tag: string; popularity: string; category: string }[] };
    }),

  /** Save a generated idea as a draft post in Supabase */
  saveDraft: protectedProcedure
    .input(z.object({
      platform: z.string(),
      content:  z.string().min(1),
      hashtags: z.array(z.string()).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const fullContent = input.hashtags.length > 0
        ? `${input.content}\n\n${input.hashtags.map(h => h.startsWith("#") ? h : `#${h}`).join(" ")}`
        : input.content;

      const { data, error } = await sb
        .from("posts")
        .insert({
          user_id:    ctx.user.id,
          platform:   input.platform,
          content:    fullContent,
          status:     "draft",
          post_type:  "text",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),

  /** List saved AI-generated drafts */
  drafts: protectedProcedure.query(async ({ ctx }) => {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("posts")
      .select("id, platforms, content, status, created_at")
      .eq("user_id", ctx.user.id)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);
    return data ?? [];
  }),
});
