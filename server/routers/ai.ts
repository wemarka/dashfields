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
Return 10-15 hashtags sorted by relevance. Format as a space-separated list.`,

  caption: `You are a social media content writer. Write engaging captions for social media posts.
Match the brand voice, include emojis tastefully, and end with a call-to-action.`,
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
});
