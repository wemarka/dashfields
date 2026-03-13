/**
 * campaignWorkflow.ts
 * Marketing Workflow Agent — full campaign creation pipeline.
 * Handles: discovery, image generation, watermarking, content plan, budget optimization, launch.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getSupabase } from "../../supabase";
import { storagePut } from "../../storage";
import {
  generateDiscoveryQuestions,
  generateImagePrompts,
  generateContentPlan,
  optimizeBudget,
  generateText,
} from "../services/gemini-text";
import { generateAdImage, getSpecsForPlatforms } from "../services/gemini-image";
import { applyWatermark, resizeForPlatform, base64ToBuffer } from "../services/watermark";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomSuffix() {
  return Math.random().toString(36).substring(2, 8);
}

async function getWorkflow(workflowId: string, userId: number) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("campaign_workflows")
    .select("*")
    .eq("id", workflowId)
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });
  return data;
}

async function getDefaultLogo(workspaceId: number): Promise<string | null> {
  const sb = getSupabase();
  const { data } = await sb
    .from("brand_logo_assets")
    .select("url")
    .eq("workspace_id", workspaceId)
    .eq("is_default", true)
    .single();
  return data?.url ?? null;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const campaignWorkflowRouter = router({

  /**
   * Create a new campaign workflow session.
   */
  create: protectedProcedure
    .input(z.object({
      workspaceId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("campaign_workflows")
        .insert({
          user_id: ctx.user.id,
          workspace_id: input.workspaceId ?? null,
          step: "discovery",
          brief: {},
          messages: [],
        })
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  /**
   * Get a workflow by ID.
   */
  get: protectedProcedure
    .input(z.object({ workflowId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return getWorkflow(input.workflowId, ctx.user.id);
    }),

  /**
   * List all workflows for the current user.
   */
  list: protectedProcedure
    .input(z.object({ workspaceId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();
      let query = sb
        .from("campaign_workflows")
        .select("*")
        .eq("user_id", ctx.user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (input.workspaceId) {
        query = query.eq("workspace_id", input.workspaceId);
      }
      const { data, error } = await query;
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data ?? [];
    }),

  /**
   * Process a user message in the workflow chat.
   * This is the main entry point for the AI agent.
   */
  chat: protectedProcedure
    .input(z.object({
      workflowId: z.string().uuid(),
      message: z.string().min(1).max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const workflow = await getWorkflow(input.workflowId, ctx.user.id);

      const messages = (workflow.messages as Array<{
        role: "user" | "assistant";
        content: string;
        timestamp: number;
        type?: string;
        data?: unknown;
      }>) ?? [];

      // Add user message
      messages.push({
        role: "user",
        content: input.message,
        timestamp: Date.now(),
        type: "text",
      });

      let assistantMessage: {
        role: "assistant";
        content: string;
        timestamp: number;
        type: string;
        data?: unknown;
      };

      const brief = (workflow.brief as Record<string, unknown>) ?? {};
      const currentStep = workflow.step as string;

      // ── Discovery Phase ──────────────────────────────────────────────────
      if (currentStep === "discovery") {
        if (messages.filter(m => m.role === "user").length === 1) {
          // First message — generate discovery questions
          const result = await generateDiscoveryQuestions(input.message);
          const questionsText = result.questions.map((q, i) => `${i + 1}. ${q}`).join("\n");

          assistantMessage = {
            role: "assistant",
            content: `بالتأكيد! يسعدني مساعدتك في إنشاء حملة إعلانية احترافية. 🎯\n\nلأتمكن من بناء حملة مثالية تناسب أهدافك، أحتاج لفهم بعض التفاصيل:\n\n${questionsText}`,
            timestamp: Date.now(),
            type: "text",
            data: { campaignType: result.campaignType, needsProductImage: result.needsProductImage },
          };

          // Update brief with initial info
          brief.campaignType = result.campaignType;
          brief.needsProductImage = result.needsProductImage;

        } else {
          // Subsequent messages — extract info and check if we have enough
          const conversationHistory = messages
            .map(m => `${m.role === "user" ? "Client" : "Assistant"}: ${m.content}`)
            .join("\n");

          const extraction = await generateText(
            `Based on this conversation, extract campaign details as JSON:
${conversationHistory}

Return ONLY valid JSON with these fields (use null for missing):
{
  "name": "campaign name",
  "product": "product/service description",
  "targetAudience": "target audience description",
  "targetCountry": "country/region",
  "budget": number or null,
  "currency": "USD/SAR/AED/etc",
  "platforms": ["facebook", "instagram", etc],
  "startDate": "YYYY-MM-DD or null",
  "endDate": "YYYY-MM-DD or null",
  "tone": "professional/fun/luxury/casual",
  "language": "ar/en",
  "objective": "awareness/sales/engagement/leads",
  "isComplete": boolean (true if we have product, audience, budget, platforms, and country)
}`,
            { temperature: 0.1 }
          );

          let extracted: Record<string, unknown> = {};
          try {
            const jsonMatch = extraction.match(/\{[\s\S]*\}/);
            if (jsonMatch) extracted = JSON.parse(jsonMatch[0]);
          } catch { /* ignore */ }

          Object.assign(brief, extracted);

          if (extracted.isComplete) {
            // Move to brand assets phase
            const logoUrl = await getDefaultLogo(workflow.workspace_id as number);
            const hasLogo = !!logoUrl || !!workflow.logo_url;

            if (hasLogo) {
              // Skip logo upload, go to generating
              await sb.from("campaign_workflows").update({
                step: "generating",
                brief,
                updated_at: new Date().toISOString(),
              }).eq("id", input.workflowId);

              assistantMessage = {
                role: "assistant",
                content: `ممتاز! لدي كل المعلومات التي أحتاجها. 🚀\n\nسأبدأ الآن بتوليد الصور الإعلانية لحملتك "${String(brief.name || "الحملة الجديدة")}".\n\nهل تريد إضافة صورة للمنتج لاستخدامها كمرجع في توليد الصور؟ أم أريد أن أبدأ التوليد مباشرة؟`,
                timestamp: Date.now(),
                type: "text",
                data: { readyToGenerate: true, hasLogo: true },
              };
            } else {
              await sb.from("campaign_workflows").update({
                step: "brand_assets",
                brief,
                updated_at: new Date().toISOString(),
              }).eq("id", input.workflowId);

              assistantMessage = {
                role: "assistant",
                content: `ممتاز! لدي كل المعلومات التي أحتاجها. 🎨\n\nالخطوة التالية: أحتاج شعار علامتك التجارية لإضافته على الصور الإعلانية.\n\nيرجى رفع الشعار بصيغة **PNG** (مع خلفية شفافة للحصول على أفضل نتيجة).`,
                timestamp: Date.now(),
                type: "text",
                data: { needsLogo: true },
              };
            }
          } else {
            // Need more info
            const followUp = await generateText(
              `You are a marketing strategist. The client is creating a campaign.
Conversation so far:
${conversationHistory}

We still need: ${!extracted.budget ? "budget, " : ""}${!extracted.platforms ? "platforms, " : ""}${!extracted.targetCountry ? "target country, " : ""}${!extracted.product ? "product details, " : ""}
Ask a friendly follow-up question to get the missing information. Be concise. Respond in ${extracted.language === "ar" ? "Arabic" : "English"}.`,
              { temperature: 0.7 }
            );

            assistantMessage = {
              role: "assistant",
              content: followUp,
              timestamp: Date.now(),
              type: "text",
            };

            await sb.from("campaign_workflows").update({
              brief,
              updated_at: new Date().toISOString(),
            }).eq("id", input.workflowId);
          }
        }
      }

      // ── Brand Assets Phase ───────────────────────────────────────────────
      else if (currentStep === "brand_assets") {
        assistantMessage = {
          role: "assistant",
          content: "يرجى رفع شعار علامتك التجارية (PNG مع خلفية شفافة) باستخدام زر الرفع أدناه.",
          timestamp: Date.now(),
          type: "text",
          data: { needsLogoUpload: true },
        };
      }

      // ── Generating Phase ─────────────────────────────────────────────────
      else if (currentStep === "generating") {
        if (input.message.toLowerCase().includes("ابدأ") || input.message.toLowerCase().includes("generate") || input.message.toLowerCase().includes("نعم") || input.message.toLowerCase().includes("yes")) {
          assistantMessage = {
            role: "assistant",
            content: "جاري توليد الصور الإعلانية... ⏳ قد يستغرق هذا 30-60 ثانية.",
            timestamp: Date.now(),
            type: "text",
            data: { generating: true },
          };
        } else {
          assistantMessage = {
            role: "assistant",
            content: "هل أنت جاهز لبدء توليد الصور الإعلانية؟",
            timestamp: Date.now(),
            type: "text",
          };
        }
      }

      // ── Creative Review Phase ────────────────────────────────────────────
      else if (currentStep === "creative_review") {
        assistantMessage = {
          role: "assistant",
          content: "راجع الصور المولّدة أدناه واختر ما يناسبك، أو اطلب إعادة توليد صور جديدة.",
          timestamp: Date.now(),
          type: "text",
        };
      }

      // ── Content Plan Phase ───────────────────────────────────────────────
      else if (currentStep === "content_plan") {
        assistantMessage = {
          role: "assistant",
          content: "جاري إعداد خطة المحتوى... ⏳",
          timestamp: Date.now(),
          type: "text",
          data: { generatingPlan: true },
        };
      }

      // ── Default ──────────────────────────────────────────────────────────
      else {
        const response = await generateText(
          `You are a marketing assistant. Respond to: "${input.message}". Be helpful and concise. Respond in Arabic.`,
          { temperature: 0.7 }
        );
        assistantMessage = {
          role: "assistant",
          content: response,
          timestamp: Date.now(),
          type: "text",
        };
      }

      messages.push(assistantMessage);

      // Save updated messages
      await sb.from("campaign_workflows").update({
        messages,
        brief,
        updated_at: new Date().toISOString(),
      }).eq("id", input.workflowId);

      return { message: assistantMessage, step: workflow.step };
    }),

  /**
   * Upload brand logo for watermarking.
   */
  uploadLogo: protectedProcedure
    .input(z.object({
      workflowId: z.string().uuid(),
      workspaceId: z.number(),
      imageBase64: z.string(),
      mimeType: z.string().default("image/png"),
      setAsDefault: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();

      // Upload logo to S3
      const logoBuffer = Buffer.from(input.imageBase64, "base64");
      const fileKey = `logos/${ctx.user.id}-${randomSuffix()}.png`;
      const { url } = await storagePut(fileKey, logoBuffer, "image/png");

      // Save to brand_logo_assets
      if (input.setAsDefault) {
        await sb.from("brand_logo_assets").update({ is_default: false })
          .eq("workspace_id", input.workspaceId);
      }

      await sb.from("brand_logo_assets").insert({
        workspace_id: input.workspaceId,
        user_id: ctx.user.id,
        url,
        file_key: fileKey,
        is_default: input.setAsDefault,
      });

      // Update workflow
      await sb.from("campaign_workflows").update({
        logo_url: url,
        step: "generating",
        updated_at: new Date().toISOString(),
      }).eq("id", input.workflowId);

      return { url, step: "generating" };
    }),

  /**
   * Generate ad creatives using Gemini Image + Sharp watermark.
   */
  generateCreatives: protectedProcedure
    .input(z.object({
      workflowId: z.string().uuid(),
      productImageBase64: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const workflow = await getWorkflow(input.workflowId, ctx.user.id);
      const brief = (workflow.brief as Record<string, unknown>) ?? {};

      const platforms = (brief.platforms as string[]) ?? ["instagram", "facebook"];
      const specs = getSpecsForPlatforms(platforms);

      // Get logo for watermark
      const logoUrl = (workflow.logo_url as string) ?? await getDefaultLogo(workflow.workspace_id as number);

      // Generate image prompts (A/B variants)
      const { prompts } = await generateImagePrompts({
        product: String(brief.product ?? "product"),
        targetAudience: String(brief.targetAudience ?? "general audience"),
        tone: String(brief.tone ?? "professional"),
        brandColors: (brief.brandColors as string[]) ?? [],
        platforms,
        language: String(brief.language ?? "ar"),
      });

      // Fetch logo buffer once (if available) to reuse across all images
      let logoBuffer: Buffer | null = null;
      if (logoUrl) {
        try {
          const logoResponse = await fetch(logoUrl);
          const logoArrayBuffer = await logoResponse.arrayBuffer();
          logoBuffer = Buffer.from(logoArrayBuffer as ArrayBuffer);
        } catch (err) {
          console.error("[CampaignWorkflow] Failed to fetch logo:", err);
        }
      }

      // Build task list: 1 prompt per spec (use variant A only for speed)
      // Limit to 4 specs max to avoid timeout
      const promptA = prompts.find(p => p.variant === "A") ?? prompts[0];
      const tasks = specs.slice(0, 4).map(spec => ({ spec, promptData: promptA }));

      // Generate all images in parallel
      const savedIds: string[] = [];
      await Promise.all(tasks.map(async ({ spec, promptData }) => {
        try {
          const [generated] = await generateAdImage(
            `${promptData.prompt}. Professional advertising photo, high quality, no text overlay.`,
            { n: 1 }
          );

          // Decode b64_json or fetch URL
          let imageBuffer: Buffer<ArrayBuffer>;
          if (generated.imageUrl.startsWith("data:")) {
            const base64Data = generated.imageUrl.split(",")[1];
            imageBuffer = Buffer.from(base64Data, "base64") as Buffer<ArrayBuffer>;
          } else {
            const imgFetch = await fetch(generated.imageUrl);
            imageBuffer = Buffer.from(await imgFetch.arrayBuffer()) as Buffer<ArrayBuffer>;
          }

          // Resize to platform dimensions
          imageBuffer = await resizeForPlatform(imageBuffer, spec.width, spec.height);

          // Apply watermark if logo available
          if (logoBuffer) {
            imageBuffer = await applyWatermark(imageBuffer, logoBuffer as Buffer<ArrayBuffer>, {
              position: "bottom-right",
              sizeRatio: 0.12,
              padding: 24,
              opacity: 0.9,
            });
          }

          // Upload to S3
          const fileKey = `creatives/${ctx.user.id}-${randomSuffix()}.png`;
          const { url: watermarkedUrl } = await storagePut(fileKey, imageBuffer, "image/png");

          // Save to DB
          const { data: creative } = await sb
            .from("campaign_creatives")
            .insert({
              workflow_id: input.workflowId,
              user_id: ctx.user.id,
              platform: spec.platform,
              format: spec.format,
              width: spec.width,
              height: spec.height,
              watermarked_url: watermarkedUrl,
              variant: promptData.variant,
              prompt: promptData.prompt,
              status: "watermarked",
              approved: false,
            })
            .select("id")
            .single();

          if (creative?.id) savedIds.push(creative.id);
        } catch (err) {
          console.error(`[CampaignWorkflow] Failed to generate creative for ${spec.platform}/${spec.format}:`, err);
        }
      }));

      const generatedCount = savedIds.length;

      // Update workflow step
      await sb.from("campaign_workflows").update({
        step: "creative_review",
        updated_at: new Date().toISOString(),
      }).eq("id", input.workflowId);

      // Add assistant message (NO creatives embedded — UI reads from getCreatives)
      const workflow2 = await getWorkflow(input.workflowId, ctx.user.id);
      const messages = (workflow2.messages as Array<Record<string, unknown>>) ?? [];
      messages.push({
        role: "assistant",
        content: `تم توليد ${generatedCount} صورة إعلانية بنجاح! 🎨\n\nراجع الصور أدناه واختر ما يناسبك. يمكنك:\n• ✅ الموافقة على صور محددة\n• 🔄 طلب إعادة توليد صور جديدة\n• ➕ إضافة المزيد من الصور`,
        timestamp: Date.now(),
        type: "image_grid",
        data: { count: generatedCount }, // no creatives array — avoids deep nesting
      });

      await sb.from("campaign_workflows").update({
        messages,
        updated_at: new Date().toISOString(),
      }).eq("id", input.workflowId);

      // Return only count + step — UI fetches creatives via getCreatives query
      return { count: generatedCount, step: "creative_review" };
    }),

  /**
   * Get all creatives for a workflow.
   */
  getCreatives: protectedProcedure
    .input(z.object({ workflowId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await getWorkflow(input.workflowId, ctx.user.id); // verify ownership
      const sb = getSupabase();
      const { data, error } = await sb
        .from("campaign_creatives")
        .select("*")
        .eq("workflow_id", input.workflowId)
        .order("created_at", { ascending: true });
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data ?? [];
    }),

  /**
   * Approve/reject a creative.
   */
  reviewCreative: protectedProcedure
    .input(z.object({
      creativeId: z.string().uuid(),
      approved: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { error } = await sb
        .from("campaign_creatives")
        .update({ approved: input.approved, status: input.approved ? "approved" : "rejected" })
        .eq("id", input.creativeId)
        .eq("user_id", ctx.user.id);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { success: true };
    }),

  /**
   * Generate content plan after creatives are approved.
   */
  generateContentPlan: protectedProcedure
    .input(z.object({ workflowId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const workflow = await getWorkflow(input.workflowId, ctx.user.id);
      const brief = (workflow.brief as Record<string, unknown>) ?? {};

      const today = new Date();
      const startDate = (brief.startDate as string) ?? today.toISOString().split("T")[0];
      const endDate = (brief.endDate as string) ?? new Date(today.getTime() + 14 * 86400000).toISOString().split("T")[0];

      const plan = await generateContentPlan({
        campaignName: String(brief.name ?? "Campaign"),
        product: String(brief.product ?? "product"),
        platforms: (brief.platforms as string[]) ?? ["instagram", "facebook"],
        targetCountry: String(brief.targetCountry ?? "Saudi Arabia"),
        startDate,
        endDate,
        tone: String(brief.tone ?? "professional"),
        language: String(brief.language ?? "ar"),
        budget: Number(brief.budget ?? 1000),
        currency: String(brief.currency ?? "SAR"),
      });

      // Save content plan items
      const insertItems = plan.items.map(item => ({
        workflow_id: input.workflowId,
        platform: item.platform.toLowerCase(),
        post_date: new Date(`${item.postDate}T${item.postTime}:00`).toISOString(),
        post_time: item.postTime,
        caption: item.caption,
        hashtags: item.hashtags,
        status: "draft",
      }));

      await sb.from("campaign_content_plan").insert(insertItems);

      // Generate budget optimization
      const budgetOpt = await optimizeBudget({
        totalBudget: Number(brief.budget ?? 1000),
        currency: String(brief.currency ?? "SAR"),
        platforms: (brief.platforms as string[]) ?? ["instagram", "facebook"],
        objective: String(brief.objective ?? "awareness"),
        targetCountry: String(brief.targetCountry ?? "Saudi Arabia"),
        campaignDuration: Math.ceil(
          (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
        ),
      });

      // Update workflow
      await sb.from("campaign_workflows").update({
        step: "budget_review",
        budget_allocation: budgetOpt.allocation,
        audience_insights: budgetOpt.insights,
        updated_at: new Date().toISOString(),
      }).eq("id", input.workflowId);

      // Add assistant message
      const workflow2 = await getWorkflow(input.workflowId, ctx.user.id);
      const messages = (workflow2.messages as Array<Record<string, unknown>>) ?? [];
      messages.push({
        role: "assistant",
        content: `تم إعداد خطة المحتوى وتحسين الميزانية! 📅\n\n**خطة المحتوى:** ${plan.items.length} منشور موزّع على ${(brief.platforms as string[])?.length ?? 2} منصات\n\n**توزيع الميزانية:**\n${Object.entries(budgetOpt.allocation).map(([p, b]) => `• ${p}: ${b} ${brief.currency}`).join("\n")}\n\n${budgetOpt.reasoning}`,
        timestamp: Date.now(),
        type: "content_plan",
        data: { plan: plan.items, budgetAllocation: budgetOpt.allocation, insights: budgetOpt.insights },
      });

      await sb.from("campaign_workflows").update({
        messages,
        updated_at: new Date().toISOString(),
      }).eq("id", input.workflowId);

      return { plan: plan.items, budgetAllocation: budgetOpt.allocation, insights: budgetOpt.insights };
    }),

  /**
   * Get content plan for a workflow.
   */
  getContentPlan: protectedProcedure
    .input(z.object({ workflowId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await getWorkflow(input.workflowId, ctx.user.id);
      const sb = getSupabase();
      const { data, error } = await sb
        .from("campaign_content_plan")
        .select("*")
        .eq("workflow_id", input.workflowId)
        .order("post_date", { ascending: true });
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data ?? [];
    }),

  /**
   * Move to preview step.
   */
  moveToPreview: protectedProcedure
    .input(z.object({ workflowId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      await getWorkflow(input.workflowId, ctx.user.id);
      await sb.from("campaign_workflows").update({
        step: "preview",
        updated_at: new Date().toISOString(),
      }).eq("id", input.workflowId);
      return { step: "preview" };
    }),

  /**
   * Confirm campaign — move to confirmed step.
   */
  confirm: protectedProcedure
    .input(z.object({ workflowId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      await getWorkflow(input.workflowId, ctx.user.id);

      const workflow = await getWorkflow(input.workflowId, ctx.user.id);
      const brief = (workflow.brief as Record<string, unknown>) ?? {};

      // Create campaign record
      const { data: campaign } = await sb.from("campaigns").insert({
        user_id: ctx.user.id,
        workspace_id: workflow.workspace_id,
        name: String(brief.name ?? "AI Campaign"),
        platform: (brief.platforms as string[])?.[0] ?? "instagram",
        status: "scheduled",
        objective: String(brief.objective ?? "awareness"),
        budget: Number(brief.budget ?? 0),
        budget_type: "lifetime",
        start_date: brief.startDate ? new Date(brief.startDate as string).toISOString() : null,
        end_date: brief.endDate ? new Date(brief.endDate as string).toISOString() : null,
        metadata: { workflow_id: input.workflowId, brief },
      }).select().single();

      await sb.from("campaign_workflows").update({
        step: "confirmed",
        campaign_id: campaign?.id ?? null,
        updated_at: new Date().toISOString(),
      }).eq("id", input.workflowId);

      return { step: "confirmed", campaignId: campaign?.id };
    }),

  /**
   * Get brand logos for a workspace.
   */
  getLogos: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("brand_logo_assets")
        .select("*")
        .eq("workspace_id", input.workspaceId)
        .eq("user_id", ctx.user.id)
        .order("created_at", { ascending: false });
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data ?? [];
    }),
});
