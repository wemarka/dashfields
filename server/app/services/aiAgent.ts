/**
 * server/app/services/aiAgent.ts
 * AI Marketing Agent — SSE streaming endpoint.
 * Handles multi-turn chat with full marketing context awareness.
 */
import type { Request, Response } from "express";
import { invokeLLM, type Message } from "../../_core/llm";
import { getUserCampaigns } from "../db/campaigns";
import { getUserSocialAccounts } from "../db/social";
import { getSupabase } from "../../supabase";
import { upsertUserBySupabaseUid } from "../db/users";

// ─── Auth helper (reuse JWT logic from context) ───────────────────────────────
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch { return null; }
}

async function getUserFromRequest(req: Request): Promise<{ id: number; name: string | null; email: string | null } | null> {
  try {
    const authHeader = req.headers.authorization ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) return null;
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const payload = decodeJwtPayload(token);
    if (!payload?.sub) return null;
    const sb = getSupabase();
    const { data, error } = await sb.auth.admin.getUserById(payload.sub as string);
    if (error || !data?.user) return null;
    const su = data.user;
    const email = su.email ?? null;
    const name = (su.user_metadata?.full_name as string | undefined) ?? email?.split("@")[0] ?? null;
    return await upsertUserBySupabaseUid({
      supabaseUid: su.id,
      email,
      name,
      loginMethod: su.app_metadata?.provider === "google" ? "google" : "email",
    });
  } catch { return null; }
}

// ─── Build marketing context for the AI ──────────────────────────────────────
async function buildMarketingContext(userId: number): Promise<string> {
  const parts: string[] = [];
  try {
    // Connected platforms
    const accounts = await getUserSocialAccounts(userId);
    if (accounts.length > 0) {
      const platforms = accounts.map(a => `${a.platform} (${a.name ?? "connected"})`).join(", ");
      parts.push(`Connected Platforms: ${platforms}`);
    } else {
      parts.push("Connected Platforms: None yet");
    }
    // Active campaigns
    const campaigns = await getUserCampaigns(userId);
    if (campaigns.length > 0) {
      const activeCampaigns = campaigns.filter(c => c.status === "active");
      parts.push(`Total Campaigns: ${campaigns.length} (${activeCampaigns.length} active)`);
      // Top 5 most recent campaigns
      const recent = campaigns.slice(0, 5).map(c =>
        `  - "${c.name}" [${c.status}] platform:${c.platform} budget:${c.budget ? `$${c.budget}/${c.budget_type ?? "total"}` : "N/A"}`
      ).join("\n");
      parts.push(`Recent Campaigns:\n${recent}`);
    } else {
      parts.push("Campaigns: None created yet");
    }
  } catch (err) {
    console.warn("[AIAgent] Failed to build context:", err);
  }
  return parts.length > 0
    ? `\n\n--- USER'S MARKETING DATA ---\n${parts.join("\n")}\n--- END DATA ---`
    : "";
}

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Dashfields AI — an expert AI Marketing Agent specialized in digital advertising and marketing for Arab and global markets.

Your capabilities:
1. **Campaign Analysis**: Analyze campaign performance, identify issues, suggest improvements
2. **Campaign Creation**: Help create complete campaigns (Meta, TikTok, LinkedIn, etc.)
3. **Ad Copy Generation**: Write compelling Arabic and English ad copy (headline, body, CTA)
4. **Audience Research**: Suggest targeting strategies for Arab and global markets
5. **Competitor Intelligence**: Analyze competitor strategies and market trends
6. **Budget Optimization**: Recommend budget allocation across platforms
7. **Creative Direction**: Describe ad creative concepts and image generation prompts
8. **Market Trends**: Identify trending topics and opportunities in Arab markets (KSA, UAE, Egypt, Jordan, etc.)

Guidelines:
- Respond in the SAME language the user writes in (Arabic or English)
- Be specific and actionable — give concrete numbers, examples, and steps
- When analyzing data, reference the user's actual campaigns and accounts
- For Arab markets: consider cultural context, Ramadan seasons, national holidays, local trends
- Format responses clearly with sections, bullet points, and bold text when helpful
- When suggesting campaigns, provide: Objective, Budget, Audience, Ad Format, Expected Results
- Always ask clarifying questions if the request is vague before proceeding`;

// ─── SSE Streaming Handler ────────────────────────────────────────────────────
export async function handleAIAgentChat(req: Request, res: Response): Promise<void> {
  // Auth
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { messages: clientMessages } = req.body as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
  };

  if (!clientMessages || clientMessages.length === 0) {
    res.status(400).json({ error: "No messages provided" });
    return;
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sendEvent = (data: string) => {
    res.write(`data: ${JSON.stringify({ text: data })}\n\n`);
  };
  const sendDone = () => {
    res.write(`data: [DONE]\n\n`);
    res.end();
  };
  const sendError = (msg: string) => {
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  };

  try {
    // Build context
    const marketingContext = await buildMarketingContext(user.id);

    // Build messages array
    const messages: Message[] = [
      {
        role: "system",
        content: SYSTEM_PROMPT + marketingContext,
      },
      ...clientMessages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // Call LLM (non-streaming — simulate streaming by chunking)
    const response = await invokeLLM({ messages, maxTokens: 2000 });
    const fullText = response?.choices?.[0]?.message?.content as string ?? "";

    if (!fullText) {
      sendError("No response from AI");
      return;
    }

    // Stream word by word for natural feel
    const words = fullText.split(/(\s+)/);
    for (let i = 0; i < words.length; i++) {
      sendEvent(words[i]);
      // Small delay for streaming effect (skip in fast mode)
      if (i % 5 === 0) {
        await new Promise(r => setTimeout(r, 8));
      }
    }

    sendDone();
  } catch (err) {
    console.error("[AIAgent] Error:", err);
    sendError("An error occurred. Please try again.");
  }
}
