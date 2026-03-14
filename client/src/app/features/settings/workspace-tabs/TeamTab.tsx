/**
 * workspace-tabs/TeamTab.tsx — Team members, invitations, ownership transfer.
 */
import { useState } from "react";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import {
  Plus, Shield, Eye, UserCheck, Crown, X, Link2, Copy,
  MailPlus, Clock, Ban, ArrowRightLeft,
} from "lucide-react";
import { ROLE_LABELS, ROLE_COLORS } from "./constants";

const ROLE_ICONS: Record<string, React.ElementType> = {
  owner: Crown, admin: Shield, member: UserCheck, viewer: Eye,
};

export function TeamTab() {
  const { activeWorkspace, canAdmin } = useWorkspace();
  const isOwner = activeWorkspace?.role === "owner";
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"admin" | "member" | "viewer">("member");
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState<number | null>(null);
  const [transferConfirm, setTransferConfirm] = useState("");

  const { data: members, isLoading } = trpc.workspaces.listMembers.useQuery(
    { workspaceId: activeWorkspace?.id ?? 0 },
    { enabled: !!activeWorkspace }
  );

  const utils = trpc.useUtils();

  const transferMutation = trpc.workspaces.transferOwnership.useMutation({
    onSuccess: () => {
      toast.success("Ownership transferred successfully");
      setShowTransfer(false); setTransferTargetId(null); setTransferConfirm("");
      utils.workspaces.listMembers.invalidate();
      utils.workspaces.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const addMutation = trpc.workspaces.addMemberByEmail.useMutation({
    onSuccess: () => { toast.success("Member added"); setAddEmail(""); utils.workspaces.listMembers.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const updateRoleMutation = trpc.workspaces.updateMemberRole.useMutation({
    onSuccess: () => { toast.success("Role updated"); utils.workspaces.listMembers.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const removeMutation = trpc.workspaces.removeMember.useMutation({
    onSuccess: () => { toast.success("Member removed"); utils.workspaces.listMembers.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  // Invite by link
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member");
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const inviteMutation = trpc.invitations.invite.useMutation({
    onSuccess: (data) => {
      setInviteLink(data.inviteUrl); setInviteEmail("");
      utils.invitations.list.invalidate();
      toast.success(`Invitation link generated for ${data.email}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const revokeMutation = trpc.invitations.revoke.useMutation({
    onSuccess: () => { toast.success("Invitation revoked"); utils.invitations.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const { data: pendingInvitations } = trpc.invitations.list.useQuery(
    { workspaceId: activeWorkspace?.id ?? 0 },
    { enabled: !!activeWorkspace && canAdmin }
  );

  if (!activeWorkspace) return null;

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Add Member */}
      {canAdmin && (
        <div className="glass rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand" /> Add Team Member
          </h3>
          <div className="flex gap-2">
            <input value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="user@example.com"
              className="flex-1 px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
            <select value={addRole} onChange={(e) => setAddRole(e.target.value as "admin" | "member" | "viewer")}
              className="px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={() => addMutation.mutate({ workspaceId: activeWorkspace.id, email: addEmail, role: addRole })}
              disabled={!addEmail || addMutation.isPending}
              className="px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {addMutation.isPending ? "Adding..." : "Add"}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground/60">The user must already have a Dashfields account.</p>
        </div>
      )}

      {/* Invite by Link */}
      {canAdmin && (
        <div className="glass rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Link2 className="w-4 h-4 text-brand" /> Invite by Link
          </h3>
          <p className="text-xs text-muted-foreground">
            Generate a secure invite link and share it with anyone — they don't need an existing account.
          </p>
          <div className="flex gap-2">
            <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="recipient@example.com"
              className="flex-1 px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as "admin" | "member" | "viewer")}
              className="px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={() => inviteMutation.mutate({
                workspaceId: activeWorkspace.id, email: inviteEmail, role: inviteRole, origin: window.location.origin,
              })}
              disabled={!inviteEmail || inviteMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <MailPlus className="w-3.5 h-3.5" />
              {inviteMutation.isPending ? "Generating..." : "Generate Link"}
            </button>
          </div>
          {inviteLink && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-brand/5 border border-brand/20">
              <Link2 className="w-3.5 h-3.5 text-brand shrink-0" />
              <span className="flex-1 text-xs font-mono text-brand truncate">{inviteLink}</span>
              <button onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success("Link copied!"); }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-brand text-brand-foreground text-xs hover:opacity-90 transition-opacity"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
          )}
          {pendingInvitations && pendingInvitations.filter((i: Record<string, unknown>) => i.status === "pending").length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Pending Invitations</p>
              {pendingInvitations
                .filter((i: Record<string, unknown>) => i.status === "pending")
                .map((inv: Record<string, unknown>) => (
                  <div key={inv.id as number} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/30">
                    <Clock className="w-3.5 h-3.5 text-brand shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{inv.email as string}</p>
                      <p className="text-[11px] text-muted-foreground">Expires {new Date(inv.expires_at as string).toLocaleDateString()}</p>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted capitalize">{inv.role as string}</span>
                    <button
                      onClick={() => revokeMutation.mutate({ invitationId: inv.id as number, workspaceId: activeWorkspace.id })}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                      title="Revoke invitation"
                    >
                      <Ban className="w-3 h-3" />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Members List */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-semibold mb-4">
          Team Members {members && <span className="text-muted-foreground font-normal">({members.length})</span>}
        </h3>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-muted/50" />
                <div className="flex-1 space-y-1"><div className="h-3 bg-muted/50 rounded w-32" /><div className="h-2.5 bg-muted/30 rounded w-24" /></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {(members ?? []).map((member: Record<string, unknown>) => {
              const user = member.users as { id: number; name: string | null; email: string | null } | null;
              const role = member.role as string;
              const userId = member.user_id as number;
              const RoleIcon = ROLE_ICONS[role] ?? UserCheck;
              return (
                <div key={userId} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-foreground/3 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center shrink-0 text-xs font-semibold text-brand">
                    {(user?.name ?? user?.email ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.name ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold ${ROLE_COLORS[role] ?? ""}`}>
                      <RoleIcon className="w-3 h-3" /> {ROLE_LABELS[role] ?? role}
                    </span>
                    {canAdmin && role !== "owner" && (
                      <>
                        <select value={role}
                          onChange={(e) => updateRoleMutation.mutate({ workspaceId: activeWorkspace.id, userId, role: e.target.value as "admin" | "member" | "viewer" })}
                          className="text-xs px-2 py-1 rounded-lg bg-background border border-border/50 focus:outline-none"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button onClick={() => removeMutation.mutate({ workspaceId: activeWorkspace.id, userId })}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                          title="Remove member"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transfer Ownership */}
      {isOwner && (
        <div className="glass rounded-2xl p-5 border border-destructive/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-destructive">Transfer Ownership</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Transfer this workspace to another admin or member.</p>
            </div>
            <button onClick={() => setShowTransfer(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-destructive/40 text-destructive text-xs font-medium hover:bg-destructive/5 transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer
            </button>
          </div>
        </div>
      )}

      {/* Transfer Ownership Modal */}
      {showTransfer && activeWorkspace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowTransfer(false)} />
          <div className="relative glass rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Transfer Ownership</h3>
              <button onClick={() => setShowTransfer(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-foreground/8 transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Select a member to become the new owner. You will be downgraded to <strong>Admin</strong>.
            </p>
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {(members ?? []).filter((m: Record<string, unknown>) => m.role !== "owner").map((member: Record<string, unknown>) => {
                const user = member.users as { id: number; name: string | null; email: string | null } | null;
                const userId = member.user_id as number;
                const role = member.role as string;
                return (
                  <button key={userId} onClick={() => setTransferTargetId(userId)}
                    className={[
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                      transferTargetId === userId ? "bg-brand/10 border border-brand/20" : "hover:bg-foreground/5",
                    ].join(" ")}
                  >
                    <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-xs font-semibold text-brand">
                      {(user?.name ?? user?.email ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user?.name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-lg bg-muted capitalize">{role}</span>
                  </button>
                );
              })}
            </div>
            {transferTargetId && (
              <div className="mb-4">
                <label className="text-xs text-muted-foreground mb-1.5 block">Type <strong>TRANSFER</strong> to confirm</label>
                <input type="text" value={transferConfirm} onChange={(e) => setTransferConfirm(e.target.value)} placeholder="TRANSFER"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30"
                />
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowTransfer(false)} className="flex-1 py-2 rounded-xl border border-border text-sm hover:bg-muted transition-colors">Cancel</button>
              <button
                disabled={!transferTargetId || transferConfirm !== "TRANSFER" || transferMutation.isPending}
                onClick={() => { if (transferTargetId) transferMutation.mutate({ workspaceId: activeWorkspace.id, newOwnerId: transferTargetId }); }}
                className="flex-1 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {transferMutation.isPending ? "Transferring..." : "Transfer Ownership"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
