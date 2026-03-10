/**
 * server/app/routers/aiConversations.ts
 * tRPC router for AI Agent conversation persistence.
 * Stores chat sessions in Supabase for cross-device sync.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { getSupabase } from "../../supabase";
import { invokeLLM } from "../../_core/llm";

const ChatMessageSchema = z.object({
  id:          z.string(),
  role:        z.enum(["user", "assistant"]),
  content:     z.string(),
  isStreaming: z.boolean().optional(),
});

const ConversationSchema = z.object({
  id:        z.string().uuid(),
  title:     z.string(),
  preview:   z.string(),
  timestamp: z.number(), // Unix ms
  messages:  z.array(ChatMessageSchema),
});

export const aiConversationsRouter = router({
  /** List the user's conversations, newest first (max 20). */
  list: protectedProcedure.query(async ({ ctx }) => {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("ai_conversations")
      .select("id, title, preview, updated_at, messages")
      .eq("user_id", ctx.user.id)
      .order("updated_at", { ascending: false })
      .limit(20);

    if (error) {
      console.warn("[aiConversations.list] Supabase error:", error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id:        row.id as string,
      title:     row.title as string,
      preview:   row.preview as string,
      timestamp: new Date(row.updated_at as string).getTime(),
      messages:  (row.messages as unknown[]) ?? [],
    }));
  }),

  /** Upsert a conversation (insert or update by id). */
  save: protectedProcedure
    .input(ConversationSchema)
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { error } = await sb
        .from("ai_conversations")
        .upsert(
          {
            id:         input.id,
            user_id:    ctx.user.id,
            title:      input.title,
            preview:    input.preview,
            messages:   input.messages,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (error) {
        console.warn("[aiConversations.save] Supabase error:", error.message);
        return { success: false };
      }
      return { success: true };
    }),

  /** Delete a conversation by id. */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { error } = await sb
        .from("ai_conversations")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);

      if (error) {
        console.warn("[aiConversations.delete] Supabase error:", error.message);
        return { success: false };
      }
      return { success: true };
    }),

  /**
   * Generate a short, smart title for a conversation using the LLM.
   * Called after the first AI reply to replace the raw user message as title.
   */
  generateTitle: protectedProcedure
    .input(z.object({
      userMessage:     z.string().max(500),
      assistantReply:  z.string().max(1000),
    }))
    .mutation(async ({ input }) => {
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "You are a concise title generator for AI chat conversations. " +
                "Given the first user message and the AI reply, generate a short, descriptive title " +
                "in 3-6 words that captures the topic. " +
                "Return ONLY the title text — no quotes, no punctuation at the end, no explanation. " +
                "Match the language of the user message (Arabic or English).",
            },
            {
              role: "user",
              content:
                `User message: ${input.userMessage.slice(0, 300)}\n\n` +
                `AI reply: ${input.assistantReply.slice(0, 500)}`,
            },
          ],
        });

        const rawContent = response?.choices?.[0]?.message?.content ?? "";
        const raw = typeof rawContent === "string" ? rawContent : "";
        const title = raw.trim().replace(/^["']|["']$/g, "").slice(0, 60);
        return { title: title || input.userMessage.slice(0, 45) };
      } catch (err) {
        console.warn("[aiConversations.generateTitle] LLM error:", err);
        // Graceful fallback: use first 45 chars of user message
        return { title: input.userMessage.slice(0, 45) };
      }
    }),
});
