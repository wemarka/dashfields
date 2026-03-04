/**
 * sentiment.ts
 * Sentiment Analysis router — Quick Analyze, Bulk, History, Dashboard
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM, type ResponseFormat } from "../_core/llm";
import { getSupabase } from "../supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SentimentResult {
  sentiment: string;
  score: number;
  confidence: number;
  emotions: string[];
  summary: string;
  suggestions: string[];
  keywords: Array<{ word: string; impact: "positive" | "negative" | "neutral"; weight: number }>;
}

// ─── LLM Analysis Helper ─────────────────────────────────────────────────────
async function analyzeSentimentLLM(text: string, language: string = "en"): Promise<SentimentResult> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a sentiment analysis expert for social media marketing content.
Analyze the sentiment of the provided text and return a JSON object with:
{
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "score": number between -1 (very negative) and 1 (very positive),
  "confidence": number between 0 and 1,
  "emotions": ["joy", "trust", "anticipation", "surprise", "fear", "sadness", "disgust", "anger"],
  "summary": "one sentence summary of the sentiment",
  "suggestions": ["actionable suggestion to improve tone 1", "suggestion 2", "suggestion 3"],
  "keywords": [
    { "word": "amazing", "impact": "positive", "weight": 0.9 },
    { "word": "problem", "impact": "negative", "weight": 0.7 }
  ]
}
Return ONLY valid JSON, no markdown. Language context: ${language}.`,
      },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" } as ResponseFormat,
  });

  const rawContent = response?.choices?.[0]?.message?.content;
  try {
    const parsed = JSON.parse(typeof rawContent === "string" ? rawContent : "{}") as Partial<SentimentResult>;
    return {
      sentiment:   parsed.sentiment   ?? "neutral",
      score:       parsed.score       ?? 0,
      confidence:  parsed.confidence  ?? 0.5,
      emotions:    parsed.emotions    ?? [],
      summary:     parsed.summary     ?? "",
      suggestions: parsed.suggestions ?? [],
      keywords:    parsed.keywords    ?? [],
    };
  } catch {
    return {
      sentiment: "neutral", score: 0, confidence: 0.5,
      emotions: [], summary: "Unable to analyze sentiment.", suggestions: [], keywords: [],
    };
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const sentimentRouter = router({
  /** Analyze a single text and save to history */
  analyze: protectedProcedure
    .input(z.object({
      text:     z.string().min(1).max(5000),
      language: z.enum(["en", "ar"]).default("en"),
      platform: z.string().optional(),
      label:    z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await analyzeSentimentLLM(input.text, input.language);

      // Save to history
      const sb = getSupabase();
      await sb.from("sentiment_analyses").insert({
        user_id:     ctx.user.id,
        text:        input.text.slice(0, 2000),
        sentiment:   result.sentiment,
        score:       result.score,
        confidence:  result.confidence,
        emotions:    result.emotions,
        summary:     result.summary,
        suggestions: result.suggestions,
        keywords:    result.keywords,
        platform:    input.platform ?? null,
        label:       input.label ?? null,
      });

      return result;
    }),

  /** Analyze multiple texts in bulk (CSV upload) */
  bulkAnalyze: protectedProcedure
    .input(z.object({
      texts:    z.array(z.string().min(1).max(2000)).min(1).max(50),
      language: z.enum(["en", "ar"]).default("en"),
      platform: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const results: Array<{ text: string; result: SentimentResult }> = [];

      for (const text of input.texts) {
        const result = await analyzeSentimentLLM(text, input.language);
        results.push({ text, result });
      }

      // Bulk save to history
      const sb = getSupabase();
      const rows = results.map(({ text, result }) => ({
        user_id:     ctx.user.id,
        text:        text.slice(0, 2000),
        sentiment:   result.sentiment,
        score:       result.score,
        confidence:  result.confidence,
        emotions:    result.emotions,
        summary:     result.summary,
        suggestions: result.suggestions,
        keywords:    result.keywords,
        platform:    input.platform ?? null,
        label:       null,
      }));
      await sb.from("sentiment_analyses").insert(rows);

      return results;
    }),

  /** Get analysis history (last 50) */
  history: protectedProcedure
    .input(z.object({
      platform:  z.string().optional(),
      sentiment: z.string().optional(),
      limit:     z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();
      let query = sb
        .from("sentiment_analyses")
        .select("*")
        .eq("user_id", ctx.user.id)
        .order("created_at", { ascending: false })
        .limit(input.limit);

      if (input.platform) query = query.eq("platform", input.platform);
      if (input.sentiment) query = query.eq("sentiment", input.sentiment);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data ?? [];
    }),

  /** Get dashboard stats: sentiment over time + platform breakdown */
  dashboardStats: protectedProcedure
    .input(z.object({
      days: z.number().min(7).max(90).default(30),
    }))
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const { data, error } = await sb
        .from("sentiment_analyses")
        .select("sentiment, score, platform, created_at, keywords")
        .eq("user_id", ctx.user.id)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw new Error(error.message);
      const rows = data ?? [];

      // Time series: group by day
      const byDay: Record<string, { positive: number; neutral: number; negative: number; mixed: number; avgScore: number; count: number }> = {};
      for (const row of rows) {
        const day = new Date(row.created_at).toISOString().slice(0, 10);
        if (!byDay[day]) byDay[day] = { positive: 0, neutral: 0, negative: 0, mixed: 0, avgScore: 0, count: 0 };
        byDay[day][row.sentiment as keyof typeof byDay[string]]++;
        byDay[day].avgScore += row.score;
        byDay[day].count++;
      }
      const timeSeries = Object.entries(byDay).map(([date, v]) => ({
        date,
        positive: v.positive,
        neutral: v.neutral,
        negative: v.negative,
        mixed: v.mixed,
        avgScore: v.count > 0 ? v.avgScore / v.count : 0,
      }));

      // Platform breakdown
      const byPlatform: Record<string, { positive: number; neutral: number; negative: number; mixed: number; total: number }> = {};
      for (const row of rows) {
        const p = row.platform ?? "unknown";
        if (!byPlatform[p]) byPlatform[p] = { positive: 0, neutral: 0, negative: 0, mixed: 0, total: 0 };
        byPlatform[p][row.sentiment as keyof typeof byPlatform[string]]++;
        byPlatform[p].total++;
      }
      const platformBreakdown = Object.entries(byPlatform).map(([platform, v]) => ({ platform, ...v }));

      // Top keywords
      const wordCount: Record<string, { count: number; impact: string; totalWeight: number }> = {};
      for (const row of rows) {
        const kws = Array.isArray(row.keywords) ? row.keywords as Array<{ word: string; impact: string; weight: number }> : [];
        for (const kw of kws) {
          if (!wordCount[kw.word]) wordCount[kw.word] = { count: 0, impact: kw.impact, totalWeight: 0 };
          wordCount[kw.word].count++;
          wordCount[kw.word].totalWeight += kw.weight ?? 0.5;
        }
      }
      const topKeywords = Object.entries(wordCount)
        .map(([word, v]) => ({ word, count: v.count, impact: v.impact, avgWeight: v.totalWeight / v.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 30);

      // Overall stats
      const total = rows.length;
      const positive = rows.filter(r => r.sentiment === "positive").length;
      const negative = rows.filter(r => r.sentiment === "negative").length;
      const neutral  = rows.filter(r => r.sentiment === "neutral").length;
      const mixed    = rows.filter(r => r.sentiment === "mixed").length;
      const avgScore = total > 0 ? rows.reduce((s, r) => s + r.score, 0) / total : 0;

      return {
        total, positive, negative, neutral, mixed, avgScore,
        timeSeries, platformBreakdown, topKeywords,
      };
    }),

  /** Delete a history entry */
  deleteHistory: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      await sb.from("sentiment_analyses").delete()
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);
      return { success: true };
    }),
});
