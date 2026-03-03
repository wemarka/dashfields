// server/db/workspaces.ts
// Database helpers for Workspaces, Members, Invitations, and Brand Profiles.
// All queries use Supabase REST client (no direct TCP).
import { getSupabase } from "../supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
export type WorkspacePlan = "free" | "pro" | "agency" | "enterprise";
export type WorkspaceMemberRole = "owner" | "admin" | "member" | "viewer";
export type WorkspaceInviteStatus = "pending" | "accepted" | "expired" | "cancelled";

export interface Workspace {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  plan: WorkspacePlan;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: number;
  workspace_id: number;
  user_id: number;
  role: WorkspaceMemberRole;
  invited_at: string;
  accepted_at: string | null;
}

export interface WorkspaceWithRole extends Workspace {
  role: WorkspaceMemberRole;
  member_count?: number;
}

export interface BrandProfile {
  id: number;
  workspace_id: number;
  industry: string | null;
  tone: string;
  language: string;
  brand_name: string | null;
  brand_desc: string | null;
  keywords: string[];
  avoid_words: string[];
  example_posts: string[];
  created_at: string;
  updated_at: string;
}

// ─── Workspace Queries ────────────────────────────────────────────────────────

/** Get all workspaces a user belongs to, with their role */
export async function getUserWorkspaces(userId: number): Promise<WorkspaceWithRole[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("workspace_members")
    .select("role, workspaces(*)")
    .eq("user_id", userId)
    .order("invited_at", { ascending: true });

  if (error) throw new Error(`[DB] getUserWorkspaces: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown>) => {
    const ws = row.workspaces as Workspace;
    return { ...ws, role: row.role as WorkspaceMemberRole };
  });
}

/** Get a single workspace by ID */
export async function getWorkspaceById(id: number): Promise<Workspace | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("workspaces")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as Workspace;
}

/** Check if a user is a member of a workspace and return their role */
export async function getWorkspaceMembership(
  workspaceId: number,
  userId: number
): Promise<WorkspaceMemberRole | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return (data as { role: WorkspaceMemberRole }).role;
}

/** Create a new workspace and add creator as owner */
export async function createWorkspace(params: {
  name: string;
  slug: string;
  logoUrl?: string;
  plan?: WorkspacePlan;
  createdBy: number;
}): Promise<Workspace> {
  const sb = getSupabase();

  const { data: ws, error: wsErr } = await sb
    .from("workspaces")
    .insert({
      name: params.name,
      slug: params.slug,
      logo_url: params.logoUrl ?? null,
      plan: params.plan ?? "free",
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (wsErr) throw new Error(`[DB] createWorkspace: ${wsErr.message}`);

  // Add creator as owner
  const { error: memberErr } = await sb.from("workspace_members").insert({
    workspace_id: (ws as Workspace).id,
    user_id: params.createdBy,
    role: "owner",
    accepted_at: new Date().toISOString(),
  });

  if (memberErr) throw new Error(`[DB] createWorkspace member: ${memberErr.message}`);

  return ws as Workspace;
}

/** Update workspace details */
export async function updateWorkspace(
  id: number,
  updates: { name?: string; logoUrl?: string | null; plan?: WorkspacePlan }
): Promise<Workspace> {
  const sb = getSupabase();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.logoUrl !== undefined) payload.logo_url = updates.logoUrl;
  if (updates.plan !== undefined) payload.plan = updates.plan;

  const { data, error } = await sb
    .from("workspaces")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`[DB] updateWorkspace: ${error.message}`);
  return data as Workspace;
}

/** Delete a workspace (cascades to all related data) */
export async function deleteWorkspace(id: number): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("workspaces").delete().eq("id", id);
  if (error) throw new Error(`[DB] deleteWorkspace: ${error.message}`);
}

/** Get all members of a workspace */
export async function getWorkspaceMembers(workspaceId: number) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("workspace_members")
    .select("*, users(id, name, email, open_id)")
    .eq("workspace_id", workspaceId)
    .order("invited_at", { ascending: true });

  if (error) throw new Error(`[DB] getWorkspaceMembers: ${error.message}`);
  return data ?? [];
}

/** Update a member's role */
export async function updateMemberRole(
  workspaceId: number,
  userId: number,
  role: WorkspaceMemberRole
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("workspace_members")
    .update({ role })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (error) throw new Error(`[DB] updateMemberRole: ${error.message}`);
}

/** Remove a member from a workspace */
export async function removeMember(workspaceId: number, userId: number): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (error) throw new Error(`[DB] removeMember: ${error.message}`);
}

/** Check if a slug is available */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const sb = getSupabase();
  const { data } = await sb.from("workspaces").select("id").eq("slug", slug).single();
  return !data;
}

// ─── Brand Profile Queries ────────────────────────────────────────────────────

/** Get brand profile for a workspace */
export async function getBrandProfile(workspaceId: number): Promise<BrandProfile | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("brand_profiles")
    .select("*")
    .eq("workspace_id", workspaceId)
    .single();

  if (error || !data) return null;
  return data as BrandProfile;
}

/** Upsert brand profile */
export async function upsertBrandProfile(
  workspaceId: number,
  updates: Partial<Omit<BrandProfile, "id" | "workspace_id" | "created_at" | "updated_at">>
): Promise<BrandProfile> {
  const sb = getSupabase();
  const payload = {
    workspace_id: workspaceId,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await sb
    .from("brand_profiles")
    .upsert(payload, { onConflict: "workspace_id" })
    .select()
    .single();

  if (error) throw new Error(`[DB] upsertBrandProfile: ${error.message}`);
  return data as BrandProfile;
}

/** Generate a URL-safe slug from a name */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 60);
}
