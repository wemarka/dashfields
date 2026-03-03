/**
 * server/db/posts.ts
 * Post-related database query helpers using Supabase client.
 */
import { getSupabase } from "../supabase";

export type PostRow = {
  id: number;
  user_id: number;
  title: string | null;
  content: string;
  media_urls: string[] | null;
  platforms: string[];
  social_account_ids: number[] | null;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export async function getUserPosts(userId: number, workspaceId?: number): Promise<PostRow[]> {
  const sb = getSupabase();
  let query = sb
    .from("posts")
    .select("*")
    .eq("user_id", userId);
  if (workspaceId) query = query.eq("workspace_id", workspaceId);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PostRow[];
}

export async function getPostById(postId: number, userId: number): Promise<PostRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("posts")
    .select("*")
    .eq("id", postId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as PostRow | null;
}

export async function createPost(post: {
  userId: number;
  title?: string | null;
  content: string;
  mediaUrls?: string[] | null;
  platforms: string[];
  socialAccountIds?: number[] | null;
  status?: string;
  scheduledAt?: string | null;
  metadata?: Record<string, unknown> | null;
  workspaceId?: number | null;
}): Promise<PostRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("posts")
    .insert({
      user_id:            post.userId,
      title:              post.title ?? null,
      content:            post.content,
      media_urls:         post.mediaUrls ?? null,
      platforms:          post.platforms,
      social_account_ids: post.socialAccountIds ?? null,
      status:             post.status ?? "draft",
      scheduled_at:       post.scheduledAt ?? null,
      metadata:           post.metadata ?? null,
      workspace_id:       post.workspaceId ?? null,
    } as any)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as PostRow | null;
}

export async function updatePostStatus(
  postId: number,
  userId: number,
  status: string
): Promise<PostRow | null> {
  const sb = getSupabase();
  const payload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "published") {
    payload.published_at = new Date().toISOString();
  }
  const { data, error } = await sb
    .from("posts")
    .update(payload as any)
    .eq("id", postId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as PostRow | null;
}

export async function deletePost(postId: number, userId: number): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function getScheduledPosts(userId: number): Promise<PostRow[]> {
  const sb = getSupabase();
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("posts")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "scheduled")
    .gte("scheduled_at", now)
    .order("scheduled_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PostRow[];
}
