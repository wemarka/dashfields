/**
 * assets.ts — tRPC router for Media Library (Assets).
 * Provides upload, list, search, tag, folder management, and delete.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { getSupabase } from "../../supabase";
import { storagePut } from "../../storage";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";

export const assetsRouter = router({
  /** List assets for current user with optional search/filter */
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        folder: z.string().optional(),
        mimeType: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();
      let query = sb
        .from("media_assets")
        .select("*", { count: "exact" })
        .eq("user_id", ctx.user.id)
        .order("created_at", { ascending: false })
        .range(input?.offset ?? 0, (input?.offset ?? 0) + (input?.limit ?? 50) - 1);

      if (input?.folder && input.folder !== "All") {
        query = query.eq("folder", input.folder);
      }
      if (input?.mimeType) {
        query = query.like("mime_type", input.mimeType + "%");
      }
      if (input?.search) {
        query = query.or(
          `file_name.ilike.%${input.search}%,tags.cs.["${input.search}"]`
        );
      }

      const { data, count, error } = await query;
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      return {
        items: data ?? [],
        total: count ?? 0,
      };
    }),

  /** Get all unique folders for the current user */
  folders: protectedProcedure.query(async ({ ctx }) => {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("media_assets")
      .select("folder")
      .eq("user_id", ctx.user.id);

    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

    const unique = Array.from(new Set((data ?? []).map((r: any) => r.folder || "Uncategorized")));
    return unique.sort();
  }),

  /** Upload a file (base64 encoded from client) */
  upload: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        mimeType: z.string(),
        base64Data: z.string(),
        size: z.number(),
        width: z.number().optional(),
        height: z.number().optional(),
        folder: z.string().default("Uncategorized"),
        tags: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.base64Data, "base64");
      const suffix = crypto.randomBytes(6).toString("hex");
      const ext = input.fileName.split(".").pop() || "bin";
      const fileKey = `assets/${ctx.user.id}/${suffix}.${ext}`;

      const { url } = await storagePut(fileKey, buffer, input.mimeType);

      const sb = getSupabase();
      const { data, error } = await sb
        .from("media_assets")
        .insert({
          user_id: ctx.user.id,
          file_name: input.fileName,
          file_key: fileKey,
          url,
          mime_type: input.mimeType,
          size: input.size,
          width: input.width ?? null,
          height: input.height ?? null,
          folder: input.folder,
          tags: JSON.stringify(input.tags),
        })
        .select()
        .single();

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  /** Update asset metadata (tags, folder, fileName) */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        fileName: z.string().optional(),
        tags: z.array(z.string()).optional(),
        folder: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();

      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (input.fileName !== undefined) updates.file_name = input.fileName;
      if (input.tags !== undefined) updates.tags = JSON.stringify(input.tags);
      if (input.folder !== undefined) updates.folder = input.folder;

      const { error } = await sb
        .from("media_assets")
        .update(updates)
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { success: true };
    }),

  /** Delete one or more assets */
  delete: protectedProcedure
    .input(z.object({ ids: z.array(z.number()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      for (const id of input.ids) {
        await sb
          .from("media_assets")
          .delete()
          .eq("id", id)
          .eq("user_id", ctx.user.id);
      }
      return { deleted: input.ids.length };
    }),

  /** Get a single asset by ID */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("media_assets")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .single();

      if (error || !data) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found" });
      }
      return data;
    }),
});
