// server/db/invitations.ts
// Workspace invitation database helpers using Supabase client.
import { getSupabase } from "../../supabase";
import crypto from "crypto";

export type InvitationRow = {
  id: number;
  workspace_id: number;
  invited_by: number;
  email: string;
  role: string;
  token: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Generate a cryptographically secure invitation token */
export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Create a new workspace invitation */
export async function createInvitation(params: {
  workspaceId: number;
  invitedBy: number;
  email: string;
  role?: string;
}): Promise<InvitationRow | null> {
  const sb = getSupabase();
  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Revoke any existing pending invitations for this email+workspace
  await sb
    .from("workspace_invitations")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("workspace_id", params.workspaceId)
    .eq("email", params.email.toLowerCase())
    .eq("status", "pending");

  const { data, error } = await sb
    .from("workspace_invitations")
    .insert({
      workspace_id: params.workspaceId,
      invited_by:   params.invitedBy,
      email:        params.email.toLowerCase(),
      role:         params.role ?? "member",
      token,
      status:       "pending",
      expires_at:   expiresAt,
    })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as InvitationRow | null;
}

/** Get invitation by token */
export async function getInvitationByToken(token: string): Promise<InvitationRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("workspace_invitations")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error) throw error;
  return data as InvitationRow | null;
}

/** Accept an invitation — adds user to workspace_members */
export async function acceptInvitation(token: string, userId: number): Promise<{ workspaceId: number; role: string } | null> {
  const sb = getSupabase();

  // Get invitation
  const inv = await getInvitationByToken(token);
  if (!inv) return null;
  if (inv.status !== "pending") throw new Error("Invitation is no longer valid.");
  if (new Date(inv.expires_at) < new Date()) {
    await sb.from("workspace_invitations").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", inv.id);
    throw new Error("Invitation has expired.");
  }

  // Add user to workspace_members (ignore duplicate)
  const { error: memberError } = await sb
    .from("workspace_members")
    .upsert({
      workspace_id: inv.workspace_id,
      user_id:      userId,
      role:         inv.role,
      accepted_at:  new Date().toISOString(),
    }, { onConflict: "workspace_id,user_id" });
  if (memberError) throw memberError;

  // Mark invitation as accepted
  await sb
    .from("workspace_invitations")
    .update({
      status:      "accepted",
      accepted_at: new Date().toISOString(),
      updated_at:  new Date().toISOString(),
    })
    .eq("id", inv.id);

  return { workspaceId: inv.workspace_id, role: inv.role };
}

/** List all invitations for a workspace */
export async function getWorkspaceInvitations(workspaceId: number): Promise<InvitationRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("workspace_invitations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as InvitationRow[];
}

/** Revoke an invitation */
export async function revokeInvitation(id: number, workspaceId: number): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("workspace_invitations")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspaceId);
  if (error) throw error;
}
