/**
 * WorkspaceSettings.tsx — Workspace & Team tab inside Settings Modal.
 * Three flat sections: Workspace Name · Team Members · Invites & Seats
 */
import { useState } from "react";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import {
  Building2, Users, Crown, Shield, UserCheck, Eye,
  Plus, MailPlus, Link2, Copy, Clock, Ban, Trash2,
  AlertTriangle, ChevronDown, Save, X,
} from "lucide-react";

// ─── Role helpers ─────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  owner: "Owner", admin: "Admin", member: "Member", viewer: "Viewer",
};
const ROLE_ICONS: Record<string, React.ElementType> = {
  owner: Crown, admin: Shield, member: UserCheck, viewer: Eye,
};
const ROLE_BADGE: Record<string, string> = {
  owner:  "bg-amber-50  text-amber-600  border border-amber-200",
  admin:  "bg-blue-50   text-blue-600   border border-blue-200",
  member: "bg-gray-100  text-gray-600   border border-gray-200",
  viewer: "bg-gray-50   text-gray-400   border border-gray-200",
};

export default function WorkspaceSettings() {
  const { activeWorkspace, workspaces, isLoading, refetch, canAdmin } = useWorkspace();
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");

  const createMutation = trpc.workspaces.create.useMutation({
    onSuccess: () => { toast.success("Workspace created!"); setShowCreate(false); setCreateName(""); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-7 pt-6 pb-5" style={{ borderBottom: "1px solid #f0f0f0" }}>
        <h2 className="text-[17px] font-semibold text-gray-900">Workspace & Team</h2>
        <p className="text-[13px] mt-0.5 text-gray-400">
          {activeWorkspace?.name ?? "Manage your workspace and team members"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-7 py-6">
        {/* ── No workspace ──────────────────────────────────────────────────── */}
        {!isLoading && workspaces.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-[15px] font-semibold text-gray-800 mb-1">No Workspace Yet</h3>
            <p className="text-[13px] text-gray-400 mb-5 max-w-[220px] leading-relaxed">
              Create your first workspace to start managing your team and brand.
            </p>
            {!showCreate ? (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#3b82f6" }}
              >
                <Plus className="w-4 h-4" /> Create Workspace
              </button>
            ) : (
              <div className="flex gap-2 w-full max-w-sm">
                <input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Workspace name..."
                  autoFocus
                  className="flex-1 px-3 py-2 rounded-xl text-[13px] border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400/40 bg-white text-gray-800"
                />
                <button
                  onClick={() => createMutation.mutate({ name: createName })}
                  disabled={!createName.trim() || createMutation.isPending}
                  className="px-4 py-2 rounded-xl text-[13px] font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: "#3b82f6" }}
                >
                  {createMutation.isPending ? "..." : "Create"}
                </button>
                <button onClick={() => setShowCreate(false)} className="px-3 py-2 rounded-xl text-[13px] text-gray-400 hover:text-gray-600">
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Workspace content ─────────────────────────────────────────────── */}
        {activeWorkspace && (
          <div className="space-y-0">
            {/* ① Workspace Name ───────────────────────────────────────────── */}
            <WorkspaceNameSection workspace={activeWorkspace} canAdmin={canAdmin} refetch={refetch} />

            <hr className="border-gray-100 my-6" />

            {/* ② Team Members ─────────────────────────────────────────────── */}
            <TeamMembersSection workspace={activeWorkspace} canAdmin={canAdmin} />

            <hr className="border-gray-100 my-6" />

            {/* ③ Invites & Seats ──────────────────────────────────────────── */}
            <InvitesSection workspace={activeWorkspace} canAdmin={canAdmin} />

            {/* Danger Zone (owner only) */}
            {activeWorkspace.role === "owner" && (
              <>
                <hr className="border-red-100 my-6" />
                <DangerSection workspace={activeWorkspace} refetch={refetch} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ① Workspace Name ─────────────────────────────────────────────────────────
function WorkspaceNameSection({
  workspace, canAdmin, refetch,
}: { workspace: { id: number; name: string; slug: string; plan: string }; canAdmin: boolean; refetch: () => void }) {
  const [name, setName] = useState(workspace.name);

  const updateMutation = trpc.workspaces.update.useMutation({
    onSuccess: () => { toast.success("Workspace name updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Workspace Name</h3>
      <p className="text-[13px] text-gray-400 mb-4">The name of your workspace visible to all members.</p>

      <div className="flex gap-3 max-w-md">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canAdmin}
          className="flex-1 px-3 py-2 rounded-xl text-[13px] border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400/40 bg-white text-gray-800 disabled:bg-gray-50 disabled:text-gray-400"
          placeholder="Workspace name"
        />
        {canAdmin && (
          <button
            onClick={() => updateMutation.mutate({ workspaceId: workspace.id, name })}
            disabled={updateMutation.isPending || name === workspace.name || !name.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium text-white disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#3b82f6" }}
          >
            <Save className="w-3.5 h-3.5" />
            {updateMutation.isPending ? "Saving..." : "Save"}
          </button>
        )}
      </div>

      {/* Plan badge */}
      <div className="mt-4 flex items-center gap-2">
        <span className="text-[12px] text-gray-400">Plan:</span>
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
          workspace.plan === "free" ? "bg-gray-100 text-gray-500" :
          workspace.plan === "pro"  ? "bg-blue-50 text-blue-600 border border-blue-200" :
          "bg-amber-50 text-amber-600 border border-amber-200"
        }`}>
          {workspace.plan}
        </span>
      </div>
    </div>
  );
}

// ─── ② Team Members ───────────────────────────────────────────────────────────
function TeamMembersSection({
  workspace, canAdmin,
}: { workspace: { id: number; role?: string }; canAdmin: boolean }) {
  const utils = trpc.useUtils();

  const { data: members, isLoading } = trpc.workspaces.listMembers.useQuery(
    { workspaceId: workspace.id },
    { enabled: !!workspace.id }
  );

  const updateRoleMutation = trpc.workspaces.updateMemberRole.useMutation({
    onSuccess: () => { toast.success("Role updated"); utils.workspaces.listMembers.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const removeMutation = trpc.workspaces.removeMember.useMutation({
    onSuccess: () => { toast.success("Member removed"); utils.workspaces.listMembers.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900">Team Members</h3>
          <p className="text-[13px] text-gray-400 mt-0.5">
            {members ? `${members.length} member${members.length !== 1 ? "s" : ""}` : "Manage your team"}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gray-100" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-100 rounded w-32" />
                <div className="h-2.5 bg-gray-100 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {(members ?? []).map((member: Record<string, unknown>) => {
            const user = member.users as { id: number; name: string | null; email: string | null } | null;
            const role = member.role as string;
            const userId = member.user_id as number;
            const RoleIcon = ROLE_ICONS[role] ?? UserCheck;
            const initials = (user?.name ?? user?.email ?? "?").charAt(0).toUpperCase();

            return (
              <div
                key={userId}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-[13px] font-semibold text-blue-600">
                  {initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-800 truncate">{user?.name ?? "Unknown"}</p>
                  <p className="text-[12px] text-gray-400 truncate">{user?.email}</p>
                </div>

                {/* Role badge */}
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${ROLE_BADGE[role] ?? ROLE_BADGE.member}`}>
                  <RoleIcon className="w-3 h-3" />
                  {ROLE_LABELS[role] ?? role}
                </span>

                {/* Actions (admin only, not for owner) */}
                {canAdmin && role !== "owner" && (
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <select
                      value={role}
                      onChange={(e) => updateRoleMutation.mutate({
                        workspaceId: workspace.id, userId,
                        role: e.target.value as "admin" | "member" | "viewer",
                      })}
                      className="text-[12px] px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400/40"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      onClick={() => removeMutation.mutate({ workspaceId: workspace.id, userId })}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                      title="Remove member"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ③ Invites & Seats ────────────────────────────────────────────────────────
function InvitesSection({
  workspace, canAdmin,
}: { workspace: { id: number }; canAdmin: boolean }) {
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "viewer">("member");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const { data: pendingInvitations } = trpc.invitations.list.useQuery(
    { workspaceId: workspace.id },
    { enabled: !!workspace.id && canAdmin }
  );

  const inviteMutation = trpc.invitations.invite.useMutation({
    onSuccess: (data) => {
      setGeneratedLink(data.inviteUrl);
      setEmail("");
      utils.invitations.list.invalidate();
      toast.success(`Invite link generated for ${data.email}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const revokeMutation = trpc.invitations.revoke.useMutation({
    onSuccess: () => { toast.success("Invitation revoked"); utils.invitations.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const pending = (pendingInvitations ?? []).filter((i: Record<string, unknown>) => i.status === "pending");

  return (
    <div>
      <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Invites & Seats</h3>
      <p className="text-[13px] text-gray-400 mb-4">
        Generate a secure invite link and share it — the recipient doesn't need an existing account.
      </p>

      {canAdmin && (
        <>
          {/* Invite form */}
          <div className="flex gap-2 max-w-lg mb-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="recipient@example.com"
              className="flex-1 px-3 py-2 rounded-xl text-[13px] border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400/40 bg-white text-gray-800"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "member" | "viewer")}
              className="px-3 py-2 rounded-xl text-[13px] border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400/40"
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={() => inviteMutation.mutate({
                workspaceId: workspace.id, email, role, origin: window.location.origin,
              })}
              disabled={!email || inviteMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium text-white disabled:opacity-50 transition-opacity hover:opacity-90 shrink-0"
              style={{ backgroundColor: "#3b82f6" }}
            >
              <MailPlus className="w-3.5 h-3.5" />
              {inviteMutation.isPending ? "Generating..." : "Send Invite"}
            </button>
          </div>

          {/* Generated link */}
          {generatedLink && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-100 mb-4 max-w-lg">
              <Link2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="flex-1 text-[12px] font-mono text-blue-600 truncate">{generatedLink}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(generatedLink); toast.success("Link copied!"); }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500 text-white text-[11px] font-medium hover:opacity-90 transition-opacity shrink-0"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
          )}

          {/* Pending invitations */}
          {pending.length > 0 && (
            <div className="mt-2">
              <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Pending — {pending.length}
              </p>
              <div className="space-y-1">
                {pending.map((inv: Record<string, unknown>) => (
                  <div
                    key={inv.id as number}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-800 truncate">{inv.email as string}</p>
                      <p className="text-[12px] text-gray-400">
                        Expires {new Date(inv.expires_at as string).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${ROLE_BADGE[inv.role as string] ?? ROLE_BADGE.member}`}>
                      {ROLE_LABELS[inv.role as string] ?? inv.role as string}
                    </span>
                    <button
                      onClick={() => revokeMutation.mutate({ invitationId: inv.id as number, workspaceId: workspace.id })}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                      title="Revoke invitation"
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!canAdmin && (
        <p className="text-[13px] text-gray-400 italic">Only admins and owners can manage invitations.</p>
      )}
    </div>
  );
}

// ─── Danger Zone ──────────────────────────────────────────────────────────────
function DangerSection({
  workspace, refetch,
}: { workspace: { id: number; name: string }; refetch: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");

  const deleteMutation = trpc.workspaces.delete.useMutation({
    onSuccess: () => { toast.success("Workspace deleted"); refetch(); window.location.href = "/"; },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-[14px] font-semibold text-red-500">Danger Zone</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-red-300 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <p className="text-[13px] text-gray-400">
            Deleting this workspace is <strong className="text-gray-700">permanent and cannot be undone</strong>. All campaigns, posts, and data will be lost.
          </p>
          <div className="space-y-1.5">
            <label className="text-[12px] text-gray-500">
              Type <span className="font-bold text-gray-800">{workspace.name}</span> to confirm
            </label>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full max-w-md px-3 py-2 rounded-xl text-[13px] border border-red-200 focus:outline-none focus:ring-1 focus:ring-red-300/50 bg-white text-gray-800"
              placeholder={workspace.name}
            />
          </div>
          <button
            onClick={() => deleteMutation.mutate({ workspaceId: workspace.id })}
            disabled={confirm !== workspace.name || deleteMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleteMutation.isPending ? "Deleting..." : "Delete Workspace"}
          </button>
        </div>
      )}
    </div>
  );
}
