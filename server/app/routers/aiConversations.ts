/**
 * server/app/routers/aiConversations.ts
 * tRPC router for AI Agent conversation persistence.
 * Stores chat sessions in Supabase for cross-device sync.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { getSupabase } from "../../supabase";

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
      // Table may not exist yet — return empty list gracefully
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
        .eq("user_id", ctx.user.id); // ensure ownership

      if (error) {
        console.warn("[aiConversations.delete] Supabase error:", error.message);
        return { success: false };
      }
      return { success: true };
    }),
});
