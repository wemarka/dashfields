/**
 * server/app/services/aiAgent.ts
 * AI Marketing Agent — SSE streaming endpoint with Tool Calling + Generative UI.
 *
 * Architecture:
 * 1. User sends message → SSE stream opens
 * 2. LLM receives system prompt + tool definitions
 * 3. If LLM returns tool_calls → execute tools → feed results back → LLM generates final response
 * 4. Final response may include ```ui-block``` fences for Generative UI rendering
 * 5. Response is streamed word-by-word to the frontend
 */
import type { Request, Response } from "express";
import { invokeLLM, type Message, type Tool } from "../../_core/llm";
import { getUserCampaigns, getCampaignMetrics, createCampaign } from "../db/campaigns";
import { getUserSocialAccounts } from "../db/social";
import { getUserPosts } from "../db/posts";
import { getUserWorkspaces, getBrandProfile } from "../db/workspaces";
import { getSupabase } from "../../supabase";
import { upsertUserBySupabaseUid } from "../db/users";
import { generateImage } from "../../_core/imageGeneration";

// ─── Auth helper ─────────────────────────────────────────────────────────────
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

// ─── Tool Definitions ────────────────────────────────────────────────────────
export const AI_AGENT_TOOLS: Tool[] = [
  {
    type: "function",
    function: {
      name: "get_campaigns",
      description: "Retrieve the user's marketing campaigns. Returns campaign list with name, platform, status, budget, and dates.",
      parameters: {
        type: "object",
        properties: {
          status_filter: {
            type: "string",
            enum: ["all", "active", "paused", "draft", "completed"],
            description: "Filter campaigns by status. Default: all",
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_campaign_metrics",
      description: "Get performance metrics (impressions, clicks, spend, reach, conversions, CTR, CPC, CPM, ROAS) for a specific campaign over a date range.",
      parameters: {
        type: "object",
        properties: {
          campaign_id: { type: "number", description: "The campaign ID to get metrics for" },
          days: { type: "number", description: "Number of days to look back. Default: 7" },
        },
        required: ["campaign_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_social_accounts",
      description: "List the user's connected social media accounts with platform, name, and active status.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_posts",
      description: "Retrieve the user's social media posts with content, platforms, status, and scheduling info.",
      parameters: {
        type: "object",
        properties: {
          status_filter: {
            type: "string",
            enum: ["all", "draft", "scheduled", "published"],
            description: "Filter posts by status. Default: all",
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_marketing_overview",
      description: "Get a high-level marketing overview: total campaigns, active campaigns, scheduled posts, connected platforms, and workspace info.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_campaign",
      description: "Create a new marketing campaign in the system. Returns the created campaign.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Campaign name" },
          platform: { type: "string", enum: ["facebook", "instagram", "tiktok", "twitter", "linkedin", "snapchat", "youtube", "pinterest"], description: "Target platform" },
          objective: { type: "string", description: "Campaign objective (e.g., brand_awareness, conversions, traffic)" },
          budget: { type: "string", description: "Budget amount as string (e.g., '500')" },
          budget_type: { type: "string", enum: ["daily", "lifetime"], description: "Budget type" },
          start_date: { type: "string", description: "Start date in YYYY-MM-DD format" },
          end_date: { type: "string", description: "End date in YYYY-MM-DD format" },
        },
        required: ["name", "platform"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_ad_image",
      description: "Generate an AI-powered advertising image based on a text prompt. Returns the image URL. Use for creating ad creatives, social media visuals, and product shots.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Detailed description of the ad image to generate. Include style, mood, colors, composition." },
        },
        required: ["prompt"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_brand_profile",
      description: "Get the user's brand profile including brand name, description, tone, industry, keywords, and brand colors.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
  },
];

// ─── Tool Execution ──────────────────────────────────────────────────────────
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: number
): Promise<string> {
  try {
    switch (toolName) {
      case "get_campaigns": {
        const campaigns = await getUserCampaigns(userId);
        const statusFilter = (args.status_filter as string) ?? "all";
        const filtered = statusFilter === "all"
          ? campaigns
          : campaigns.filter(c => c.status === statusFilter);
        return JSON.stringify({
          total: filtered.length,
          campaigns: filtered.slice(0, 20).map(c => ({
            id: c.id,
            name: c.name,
            platform: c.platform,
            status: c.status,
            objective: c.objective,
            budget: c.budget ? `${c.budget} ${c.budget_type ?? ""}`.trim() : null,
            start_date: c.start_date,
            end_date: c.end_date,
            created_at: c.created_at,
          })),
        });
      }

      case "get_campaign_metrics": {
        const campaignId = args.campaign_id as number;
        const days = (args.days as number) ?? 7;
        const metrics = await getCampaignMetrics(campaignId, days);
        let totalImpressions = 0, totalClicks = 0, totalSpend = 0, totalReach = 0, totalConversions = 0;
        for (const m of metrics) {
          totalImpressions += m.impressions ?? 0;
          totalClicks += m.clicks ?? 0;
          totalSpend += parseFloat(m.spend ?? "0");
          totalReach += m.reach ?? 0;
          totalConversions += m.conversions ?? 0;
        }
        const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0";
        const cpc = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : "0";
        const cpm = totalImpressions > 0 ? ((totalSpend / totalImpressions) * 1000).toFixed(2) : "0";
        return JSON.stringify({
          period_days: days,
          daily_data: metrics.slice(0, 14).map(m => ({
            date: m.date,
            impressions: m.impressions,
            clicks: m.clicks,
            spend: m.spend,
            reach: m.reach,
            conversions: m.conversions,
          })),
          totals: {
            impressions: totalImpressions,
            clicks: totalClicks,
            spend: totalSpend.toFixed(2),
            reach: totalReach,
            conversions: totalConversions,
            ctr: `${ctr}%`,
            cpc,
            cpm,
          },
        });
      }

      case "get_social_accounts": {
        const accounts = await getUserSocialAccounts(userId);
        return JSON.stringify({
          total: accounts.length,
          accounts: accounts.map(a => ({
            id: a.id,
            platform: a.platform,
            name: a.name,
            username: a.username,
            is_active: a.is_active,
          })),
        });
      }

      case "get_posts": {
        const posts = await getUserPosts(userId);
        const statusFilter = (args.status_filter as string) ?? "all";
        const filtered = statusFilter === "all"
          ? posts
          : posts.filter(p => p.status === statusFilter);
        return JSON.stringify({
          total: filtered.length,
          posts: filtered.slice(0, 15).map(p => ({
            id: p.id,
            title: p.title,
            content: p.content?.slice(0, 100),
            platforms: p.platforms,
            status: p.status,
            scheduled_at: p.scheduled_at,
            published_at: p.published_at,
          })),
        });
      }

      case "get_marketing_overview": {
        const [campaigns, accounts, posts, workspaces] = await Promise.all([
          getUserCampaigns(userId),
          getUserSocialAccounts(userId),
          getUserPosts(userId),
          getUserWorkspaces(userId),
        ]);
        const activeCampaigns = campaigns.filter(c => c.status === "active");
        const scheduledPosts = posts.filter(p => p.status === "scheduled");
        const platformCounts: Record<string, number> = {};
        for (const c of campaigns) {
          platformCounts[c.platform] = (platformCounts[c.platform] ?? 0) + 1;
        }
        return JSON.stringify({
          total_campaigns: campaigns.length,
          active_campaigns: activeCampaigns.length,
          total_posts: posts.length,
          scheduled_posts: scheduledPosts.length,
          connected_accounts: accounts.length,
          platforms: accounts.map(a => a.platform),
          campaigns_by_platform: platformCounts,
          workspace: workspaces[0] ? { name: workspaces[0].name, plan: workspaces[0].plan } : null,
        });
      }

      case "create_campaign": {
        const campaign = await createCampaign({
          userId,
          name: args.name as string,
          platform: args.platform as string,
          objective: (args.objective as string) ?? null,
          budget: (args.budget as string) ?? null,
          budgetType: (args.budget_type as string) ?? null,
          startDate: (args.start_date as string) ?? null,
          endDate: (args.end_date as string) ?? null,
          status: "draft",
        });
        return JSON.stringify({
          success: true,
          campaign: campaign ? {
            id: campaign.id,
            name: campaign.name,
            platform: campaign.platform,
            status: campaign.status,
            budget: campaign.budget,
          } : null,
        });
      }

      case "generate_ad_image": {
        const prompt = args.prompt as string;
        const result = await generateImage({ prompt });
        return JSON.stringify({
          success: true,
          image_url: result.url ?? null,
        });
      }

      case "get_brand_profile": {
        const workspaces = await getUserWorkspaces(userId);
        if (workspaces.length === 0) {
          return JSON.stringify({ brand: null, message: "No workspace found" });
        }
        const brand = await getBrandProfile(workspaces[0].id);
        return JSON.stringify({
          brand: brand ? {
            brand_name: brand.brand_name,
            brand_desc: brand.brand_desc,
            tone: brand.tone,
            industry: brand.industry,
            language: brand.language,
            keywords: brand.keywords,
            avoid_words: brand.avoid_words,
            brand_colors: brand.brand_colors,
            website_url: brand.website_url,
          } : null,
        });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (err) {
    console.error(`[AIAgent] Tool execution error (${toolName}):`, err);
    return JSON.stringify({ error: `Tool execution failed: ${(err as Error).message}` });
  }
}

// ─── System Prompt ───────────────────────────────────────────────────────────
export const SYSTEM_PROMPT = `You are **Dashfields AI** — a world-class AI Marketing Director embedded inside the Dashfields marketing platform.

## Your Role
You are the user's personal marketing strategist, analyst, and creative director. You have direct access to their marketing data through tools and can take actions on their behalf.

## Capabilities
1. **Campaign Management** — View, create, and analyze marketing campaigns across all platforms
2. **Performance Analytics** — Pull real metrics (impressions, clicks, CTR, CPC, ROAS) and provide data-driven insights
3. **Content Strategy** — Generate ad copy, captions, hashtags, and content calendars
4. **Creative Direction** — Generate AI-powered ad images and provide creative feedback
5. **Budget Optimization** — Analyze spend efficiency and recommend budget allocation
6. **Audience Intelligence** — Analyze audience data and suggest targeting strategies
7. **Brand Consistency** — Access brand profile to ensure all content matches brand voice

## Generative UI — CRITICAL INSTRUCTIONS
You can render rich interactive UI components inside chat by using special \`\`\`ui-block\`\`\` code fences.
When presenting data, metrics, campaign info, or structured content, you MUST use ui-blocks instead of plain text tables.

### Available UI Block Types:

1. **metric_card** — For KPIs and single metrics
\`\`\`ui-block
{"type":"metric_card","title":"Total Spend","value":"$1,234","change":"+12.5%","changeType":"positive","subtitle":"Last 7 days"}
\`\`\`

2. **data_table** — For tabular data
\`\`\`ui-block
{"type":"data_table","title":"Campaign Performance","columns":["Campaign","Platform","Spend","CTR"],"rows":[["Summer Sale","Facebook","$500","2.3%"],["Brand Launch","Instagram","$300","3.1%"]]}
\`\`\`

3. **bar_chart** — For visual comparisons
\`\`\`ui-block
{"type":"bar_chart","title":"Spend by Platform","labels":["Facebook","Instagram","TikTok"],"values":[500,300,200]}
\`\`\`

4. **progress_card** — For goals/completion tracking
\`\`\`ui-block
{"type":"progress_card","title":"Monthly Budget Used","current":750,"total":1000,"unit":"USD"}
\`\`\`

5. **campaign_summary** — For campaign overview cards
\`\`\`ui-block
{"type":"campaign_summary","name":"Summer Sale 2026","status":"active","budget":"$1,000/day","reach":"45,000","clicks":"1,200","conversions":"89","platforms":["Facebook","Instagram"]}
\`\`\`

6. **status_list** — For health checks and status overviews
\`\`\`ui-block
{"type":"status_list","title":"Campaign Health","items":[{"label":"Budget utilization","status":"success","detail":"On track"},{"label":"CTR performance","status":"warning","detail":"Below average"}]}
\`\`\`

7. **action_buttons** — For suggested next actions
\`\`\`ui-block
{"type":"action_buttons","buttons":[{"label":"Create Campaign","action":"Create a new campaign for me","variant":"default"},{"label":"View Analytics","action":"Show me my analytics overview","variant":"outline"}]}
\`\`\`

8. **suggestion_chips** — For follow-up suggestions
\`\`\`ui-block
{"type":"suggestion_chips","chips":["Optimize my budget","Show top campaigns","Generate ad copy","Analyze competitors"]}
\`\`\`

9. **info_card** — For rich information cards
\`\`\`ui-block
{"type":"info_card","title":"Pro Tip","description":"Campaigns with video content get 2x more engagement on Instagram Reels.","badges":["Instagram","Video","Engagement"]}
\`\`\`

10. **image_gallery** \u2014 For displaying generated images
\`\`\`ui-block
{"type":"image_gallery","title":"Generated Ad Creatives","images":[{"url":"https://...","caption":"Variant A - Minimalist"}]}
\`\`\`

11. **campaign_preview** \u2014 For campaign previews with auto-generated ad images (CRITICAL: use this for any campaign preview, ad creative, or ad design request)
\`\`\`ui-block
{"type":"campaign_preview","campaign_name":"Summer Sale 2026","platform":"instagram","objective":"conversions","target_audience":"Women 25-45 interested in fashion","ad_copy":"Discover our exclusive summer collection \u2014 up to 50% off!","cta":"Shop Now","budget":"$500/day","image_prompt_idea":"A vibrant summer fashion photoshoot with a model wearing a flowing white dress on a Mediterranean beach, golden hour lighting, luxury brand aesthetic, clean composition with space for text overlay","headline":"Summer Collection 2026","description":"Limited time offer \u2014 free shipping on all orders"}
\`\`\`

### UI Block Rules:
- Use **metric_card** when showing 1-4 KPIs. For multiple metrics, output multiple metric_card blocks.
- Use **data_table** for comparing 3+ items with multiple attributes.
- Use **bar_chart** when visual comparison helps understanding.
- Use **campaign_summary** when discussing a specific campaign.
- ALWAYS end responses with **suggestion_chips** to guide the conversation forward.
- Each ui-block fence must contain exactly ONE valid JSON object (not an array).
- You can have multiple ui-block fences in one response.
- Mix text explanations with ui-blocks for the best experience.

## Language & Tone
- ALWAYS respond in the SAME language the user writes in (Arabic or English)
- Be specific, actionable, and data-driven
- Use a professional but friendly tone — like a trusted marketing advisor
- For Arab markets: consider cultural context, Ramadan, national holidays, local trends
- When the user speaks Arabic, use Arabic for all text including ui-block labels and values

## Tool Usage
- ALWAYS use tools to fetch real data before answering data questions — never guess or make up numbers
- When the user asks about campaigns, accounts, or performance, call the appropriate tool first
- For ad creative / campaign preview requests: DO NOT use generate_ad_image tool. Instead, output a **campaign_preview** ui-block with a detailed \`image_prompt_idea\` field. The frontend will automatically call the image generation API and render the result inside the preview card.
- The \`image_prompt_idea\` field must be a detailed, professional image generation prompt (50-150 words) describing the exact visual: composition, colors, mood, style, subjects, lighting, and brand elements.
- When creating campaigns, confirm details with the user before calling create_campaign
- NEVER simulate file attachments or placeholder image filenames (like "صورة_إعلانية.jpg"). Always use the campaign_preview ui-block for any visual ad content.

## Response Structure
1. Brief acknowledgment or insight
2. Data/UI blocks with real information
3. Analysis or recommendations
4. Suggestion chips for next steps`;

// ─── SSE Streaming Handler ───────────────────────────────────────────────────
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

  const sendChunk = (content: string) => {
    res.write(`data: ${JSON.stringify({ content })}\n\n`);
  };
  const sendStatus = (status: string) => {
    res.write(`data: ${JSON.stringify({ status })}\n\n`);
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
    // Build messages array with system prompt
    const messages: Message[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...clientMessages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // ── Tool Calling Loop (max 3 iterations to prevent infinite loops) ──
    let iteration = 0;
    const MAX_ITERATIONS = 3;
    let finalText = "";

    while (iteration < MAX_ITERATIONS) {
      iteration++;

      const response = await invokeLLM({
        messages,
        tools: AI_AGENT_TOOLS,
        tool_choice: "auto",
        maxTokens: 4096,
      });

      const choice = response?.choices?.[0];
      if (!choice) {
        sendError("No response from AI");
        return;
      }

      const assistantMessage = choice.message;
      const toolCalls = assistantMessage.tool_calls;

      // If no tool calls, we have the final response
      if (!toolCalls || toolCalls.length === 0) {
        finalText = (typeof assistantMessage.content === "string" ? assistantMessage.content : "") ?? "";
        break;
      }

      // Execute tool calls — send status updates to frontend
      sendStatus("thinking");

      // Add assistant message with tool_calls to history
      // We need to pass tool_calls in the message for the API to accept tool results
      const assistantContent = (typeof assistantMessage.content === "string" ? assistantMessage.content : "") ?? "";
      // Push the raw assistant response object so tool_calls are preserved
      messages.push({
        role: "assistant",
        content: assistantContent || "",
        // The invokeLLM normalizer will handle this
      } as Message);
      // Manually attach tool_calls to the last message for the API
      const lastMsg = messages[messages.length - 1] as Record<string, unknown>;
      lastMsg.tool_calls = toolCalls;

      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        let toolArgs: Record<string, unknown> = {};
        try {
          toolArgs = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
        } catch {
          toolArgs = {};
        }

        sendStatus(`tool:${toolName}`);

        const result = await executeTool(toolName, toolArgs, user.id);

        // Add tool result to messages
        messages.push({
          role: "tool",
          content: result,
          tool_call_id: toolCall.id,
          name: toolName,
        });
      }
    }

    if (!finalText) {
      sendError("Unable to generate response. Please try again.");
      return;
    }

    // Stream the final response word by word
    const words = finalText.split(/(\s+)/);
    for (let i = 0; i < words.length; i++) {
      sendChunk(words[i]);
      // Small delay for natural streaming feel
      if (i % 4 === 0) {
        await new Promise(r => setTimeout(r, 6));
      }
    }

    sendDone();
  } catch (err) {
    console.error("[AIAgent] Error:", err);
    sendError("An error occurred. Please try again.");
  }
}
