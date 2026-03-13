/**
 * gemini-text.ts
 * Atlas Cloud → Gemini Flash Lite 3.1 — fast text generation for marketing content.
 * Uses OpenAI-compatible API at https://api.atlascloud.ai/v1
 * Used for: discovery questions, captions, hashtags, content plans, budget optimization.
 */

const ATLAS_BASE_URL = "https://api.atlascloud.ai/v1";
const TEXT_MODEL = "google/gemini-3.1-flash-lite-preview";

function getApiKey(): string {
  const key = process.env.ATLAS_API_KEY;
  if (!key) throw new Error("[Atlas] ATLAS_API_KEY is not set");
  return key;
}

export interface GeminiTextOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AtlasResponse {
  choices: Array<{ message: { content: string } }>;
}

async function callAtlas(
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number
): Promise<string> {
  const response = await fetch(`${ATLAS_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`[Atlas Text] ${response.status}: ${err}`);
  }

  const data = (await response.json()) as AtlasResponse;
  return data.choices[0]?.message?.content ?? "";
}

/**
 * Generate text using Gemini Flash Lite 3.1 via Atlas Cloud.
 */
export async function generateText(
  prompt: string,
  options: GeminiTextOptions = {}
): Promise<string> {
  const { systemPrompt, temperature = 0.7, maxTokens = 2048 } = options;
  const messages: ChatMessage[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });
  return callAtlas(messages, temperature, maxTokens);
}

/**
 * Multi-turn chat using Gemini Flash Lite 3.1 via Atlas Cloud.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: GeminiTextOptions = {}
): Promise<string> {
  const { temperature = 0.7, maxTokens = 2048 } = options;
  return callAtlas(messages, temperature, maxTokens);
}

/**
 * Generate structured JSON using Gemini Flash Lite 3.1.
 */
export async function generateJSON<T = unknown>(
  prompt: string,
  options: GeminiTextOptions = {}
): Promise<T> {
  const jsonPrompt = `${prompt}\n\nRespond ONLY with valid JSON. No markdown, no explanation.`;
  const text = await generateText(jsonPrompt, { ...options, temperature: options.temperature ?? 0.3 });

  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error(`[Atlas] Failed to parse JSON: ${cleaned.substring(0, 200)}`);
  }
}

/**
 * Generate marketing campaign discovery questions based on initial user message.
 */
export async function generateDiscoveryQuestions(userMessage: string): Promise<{
  questions: string[];
  campaignType: string;
  needsProductImage: boolean;
}> {
  return generateJSON(
    `User wants to create a marketing campaign. Their initial request: "${userMessage}"

Analyze this request and return a JSON object with:
- questions: array of 3-5 targeted questions to understand the campaign better (ask about: product/service details, target audience, budget, target country/region, campaign duration, preferred platforms, brand tone)
- campaignType: one of "product_launch", "promotion", "brand_awareness", "seasonal", "lead_generation", "engagement"
- needsProductImage: boolean — true if this campaign would benefit from product images (physical products, fashion, food, beauty, etc.)

Respond in the same language as the user's message. Be conversational and professional.`,
    {
      systemPrompt: "You are an expert marketing strategist helping clients create effective ad campaigns.",
      temperature: 0.5,
    }
  );
}

/**
 * Generate image prompts for Atlas Cloud image generation.
 */
export async function generateImagePrompts(brief: {
  product: string;
  targetAudience: string;
  tone: string;
  brandColors?: string[];
  platforms: string[];
  language: string;
}): Promise<{ prompts: Array<{ variant: "A" | "B"; prompt: string; style: string }> }> {
  return generateJSON(
    `Create 2 distinct advertising image prompts (A/B variants) for:
Product/Service: ${brief.product}
Target Audience: ${brief.targetAudience}
Brand Tone: ${brief.tone}
Brand Colors: ${brief.brandColors?.join(", ") || "not specified"}
Platforms: ${brief.platforms.join(", ")}

Return JSON with:
- prompts: array of 2 objects, each with:
  - variant: "A" or "B"
  - prompt: detailed image generation prompt in English (describe composition, lighting, mood, style, colors)
  - style: brief style description (e.g., "Minimalist lifestyle", "Bold product showcase")

Make variant A more clean/minimalist and variant B more vibrant/bold.
Each prompt should be suitable for social media advertising.`,
    { temperature: 0.8 }
  );
}

/**
 * Generate content plan (captions, hashtags, posting schedule).
 */
export async function generateContentPlan(brief: {
  campaignName: string;
  product: string;
  platforms: string[];
  targetCountry: string;
  startDate: string;
  endDate: string;
  tone: string;
  language: string;
  budget: number;
  currency: string;
}): Promise<{
  items: Array<{
    platform: string;
    postDate: string;
    postTime: string;
    caption: string;
    hashtags: string[];
    contentType: string;
  }>;
}> {
  return generateJSON(
    `Create a social media content plan for:
Campaign: ${brief.campaignName}
Product: ${brief.product}
Platforms: ${brief.platforms.join(", ")}
Target Country: ${brief.targetCountry}
Duration: ${brief.startDate} to ${brief.endDate}
Tone: ${brief.tone}
Language: ${brief.language}
Budget: ${brief.budget} ${brief.currency}

Generate a content calendar with optimal posting times for ${brief.targetCountry}.
Return JSON with items array. Each item:
- platform: platform name
- postDate: YYYY-MM-DD format
- postTime: HH:MM format (24h, optimal for the target country)
- caption: engaging caption in ${brief.language} (include emojis if appropriate)
- hashtags: array of 5-10 relevant hashtags (mix of popular and niche)
- contentType: "feed_post" | "story" | "reel"

Create 2-3 posts per platform spread across the campaign duration.`,
    { temperature: 0.7, maxTokens: 4096 }
  );
}

/**
 * Optimize budget allocation across platforms.
 */
export async function optimizeBudget(brief: {
  totalBudget: number;
  currency: string;
  platforms: string[];
  objective: string;
  targetCountry: string;
  campaignDuration: number;
}): Promise<{
  allocation: Record<string, number>;
  reasoning: string;
  insights: Record<string, {
    bestTimes: string[];
    ageRange: string;
    estimatedReach: number;
    cpm: number;
    recommendation: string;
  }>;
}> {
  return generateJSON(
    `Optimize a ${brief.totalBudget} ${brief.currency} advertising budget across platforms for ${brief.campaignDuration} days.

Objective: ${brief.objective}
Target Country: ${brief.targetCountry}
Platforms: ${brief.platforms.join(", ")}

Return JSON with:
- allocation: object mapping platform name to budget amount (must sum to ${brief.totalBudget})
- reasoning: brief explanation of the allocation strategy
- insights: object mapping platform name to:
  - bestTimes: array of 2-3 best posting times (e.g., "18:00-20:00")
  - ageRange: primary age demographic (e.g., "18-34")
  - estimatedReach: estimated reach with allocated budget (number)
  - cpm: estimated CPM in ${brief.currency}
  - recommendation: one-sentence platform-specific tip

Base allocations on typical ${brief.targetCountry} market performance data for ${brief.objective} campaigns.`,
    { temperature: 0.3 }
  );
}
