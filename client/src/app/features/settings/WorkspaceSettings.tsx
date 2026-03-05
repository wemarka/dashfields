// WorkspaceSettings.tsx
// Workspace management page with 4 tabs:
//  1. General — name, logo, plan
//  2. Team — members list, roles, add member
//  3. Brand Profile — AI brand identity settings
//  4. Financials & Goals — currency, monthly budget, target ROAS
import { useState, useEffect } from "react";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import {
  Building2, Users, Sparkles, Settings, Trash2,
  ChevronDown, Plus, Shield, Eye, UserCheck, Crown,
  Tag, X, Save, AlertTriangle, Link2, Copy, MailPlus,
  Clock, CheckCircle2, Ban, Upload, ImageIcon, ArrowRightLeft,
  DollarSign, Target, TrendingUp, Info,
} from "lucide-react";
import { getCurrencySymbol } from "@/shared/hooks/useCurrency";

// ─── Types ────────────────────────────────────────────────────────────────────
type TabId = "general" | "team" | "brand" | "financials";

// ─── Currency list ────────────────────────────────────────────────────────────
const CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "AED", name: "UAE Dirham" },
  { code: "KWD", name: "Kuwaiti Dinar" },
  { code: "BHD", name: "Bahraini Dinar" },
  { code: "OMR", name: "Omani Rial" },
  { code: "QAR", name: "Qatari Riyal" },
  { code: "JOD", name: "Jordanian Dinar" },
  { code: "EGP", name: "Egyptian Pound" },
  { code: "MAD", name: "Moroccan Dirham" },
  { code: "TND", name: "Tunisian Dinar" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "INR", name: "Indian Rupee" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "ZAR", name: "South African Rand" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "KES", name: "Kenyan Shilling" },
];

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const ROLE_ICONS: Record<string, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  member: UserCheck,
  viewer: Eye,
};

const ROLE_COLORS: Record<string, string> = {
  owner: "text-amber-500 bg-amber-500/10",
  admin: "text-blue-500 bg-blue-500/10",
  member: "text-emerald-500 bg-emerald-500/10",
  viewer: "text-muted-foreground bg-muted",
};

const TONE_OPTIONS = ["Professional", "Casual", "Friendly", "Bold", "Inspirational", "Educational"];
const INDUSTRY_OPTIONS = [
  "E-commerce", "Technology", "Healthcare", "Finance", "Education",
  "Food & Beverage", "Fashion", "Travel", "Real Estate", "Entertainment", "Other",
];

// ─── General Tab ──────────────────────────────────────────────────────────────
function GeneralTab() {
  const { activeWorkspace, refetch, canAdmin } = useWorkspace();
  const [name, setName] = useState(activeWorkspace?.name ?? "");
  const [showDanger, setShowDanger] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(activeWorkspace?.logo_url ?? null);
  const [logoUploading, setLogoUploading] = useState(false);

  const uploadLogoMutation = trpc.workspaces.uploadLogo.useMutation({
    onSuccess: (data) => {
      setLogoPreview(data.url);
      toast.success("Logo updated!");
      refetch();
    },
    onError: (e) => toast.error(e.message),
    onSettled: () => setLogoUploading(false),
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeWorkspace) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setLogoPreview(dataUrl);
      setLogoUploading(true);
      uploadLogoMutation.mutate({
        workspaceId: activeWorkspace.id,
        dataUrl,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const updateMutation = trpc.workspaces.update.useMutation({
    onSuccess: () => {
      toast.success("Workspace updated");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.workspaces.delete.useMutation({
    onSuccess: () => {
      toast.success("Workspace deleted");
      refetch();
      window.location.href = "/";
    },
    onError: (e) => toast.error(e.message),
  });

  if (!activeWorkspace) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>No workspace selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Logo Upload */}
      {canAdmin && (
        <div className="glass rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-brand" />
            Workspace Logo
          </h3>
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center overflow-hidden border-2 border-border/40">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-7 h-7 text-brand/50" />
              )}
              {logoUploading && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand/10 text-brand text-xs font-medium cursor-pointer hover:bg-brand/20 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                {logoUploading ? "Uploading..." : "Upload Logo"}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} disabled={logoUploading} />
              </label>
              <p className="text-[11px] text-muted-foreground/60">PNG, JPG, SVG • Max 2MB</p>
            </div>
            {logoPreview && activeWorkspace?.logo_url && (
              <button
                onClick={() => {
                  setLogoPreview(null);
                  uploadLogoMutation.mutate({ workspaceId: activeWorkspace.id, dataUrl: "", mimeType: "image/png" });
                }}
                className="ml-auto text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )}

      {/* Workspace Info */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold">Workspace Information</h3>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Workspace Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            placeholder="My Workspace"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Slug</label>
          <input
            value={activeWorkspace.slug}
            disabled
            className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border/40 text-sm text-muted-foreground cursor-not-allowed"
          />
          <p className="text-[11px] text-muted-foreground/60">Slug cannot be changed after creation.</p>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Plan</label>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${
              activeWorkspace.plan === "free" ? "bg-muted text-muted-foreground" :
              activeWorkspace.plan === "pro" ? "bg-brand/10 text-brand" :
              "bg-amber-500/10 text-amber-500"
            }`}>
              {activeWorkspace.plan}
            </span>
            <span className="text-xs text-muted-foreground">Your current plan</span>
          </div>
        </div>

        <button
          onClick={() => updateMutation.mutate({ workspaceId: activeWorkspace.id, name })}
          disabled={updateMutation.isPending || name === activeWorkspace.name}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Save className="w-3.5 h-3.5" />
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Danger Zone */}
      {activeWorkspace.role === "owner" && (
        <div className="glass rounded-2xl p-5 border border-destructive/20">
          <button
            onClick={() => setShowDanger((s) => !s)}
            className="w-full flex items-center justify-between text-sm font-semibold text-destructive"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Danger Zone
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showDanger ? "rotate-180" : ""}`} />
          </button>

          {showDanger && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Deleting this workspace is permanent and cannot be undone. All campaigns, posts, and data will be lost.
              </p>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">
                  Type <span className="font-bold text-foreground">{activeWorkspace.name}</span> to confirm
                </label>
                <input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-destructive/30 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30"
                  placeholder={activeWorkspace.name}
                />
              </div>
              <button
                onClick={() => deleteMutation.mutate({ workspaceId: activeWorkspace.id })}
                disabled={deleteConfirm !== activeWorkspace.name || deleteMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleteMutation.isPending ? "Deleting..." : "Delete Workspace"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────
function TeamTab() {
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
      setShowTransfer(false);
      setTransferTargetId(null);
      setTransferConfirm("");
      utils.workspaces.listMembers.invalidate();
      utils.workspaces.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const addMutation = trpc.workspaces.addMemberByEmail.useMutation({
    onSuccess: () => {
      toast.success("Member added");
      setAddEmail("");
      utils.workspaces.listMembers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateRoleMutation = trpc.workspaces.updateMemberRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated");
      utils.workspaces.listMembers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMutation = trpc.workspaces.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Member removed");
      utils.workspaces.listMembers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Invite by link ─────────────────────────────────────────────────────
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member");
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const inviteMutation = trpc.invitations.invite.useMutation({
    onSuccess: (data) => {
      setInviteLink(data.inviteUrl);
      setInviteEmail("");
      utils.invitations.list.invalidate();
      toast.success(`Invitation link generated for ${data.email}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const revokeMutation = trpc.invitations.revoke.useMutation({
    onSuccess: () => {
      toast.success("Invitation revoked");
      utils.invitations.list.invalidate();
    },
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
            <Plus className="w-4 h-4 text-brand" />
            Add Team Member
          </h3>
          <div className="flex gap-2">
            <input
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="user@example.com"
              className="flex-1 px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as "admin" | "member" | "viewer")}
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
          <p className="text-[11px] text-muted-foreground/60">
            The user must already have a Dashfields account.
          </p>
        </div>
      )}

      {/* Invite by Link */}
      {canAdmin && (
        <div className="glass rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Link2 className="w-4 h-4 text-brand" />
            Invite by Link
          </h3>
          <p className="text-xs text-muted-foreground">
            Generate a secure invite link and share it with anyone — they don't need an existing account.
          </p>
          <div className="flex gap-2">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="recipient@example.com"
              className="flex-1 px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "admin" | "member" | "viewer")}
              className="px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={() => inviteMutation.mutate({
                workspaceId: activeWorkspace.id,
                email: inviteEmail,
                role: inviteRole,
                origin: window.location.origin,
              })}
              disabled={!inviteEmail || inviteMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <MailPlus className="w-3.5 h-3.5" />
              {inviteMutation.isPending ? "Generating..." : "Generate Link"}
            </button>
          </div>

          {/* Generated invite link */}
          {inviteLink && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-brand/5 border border-brand/20">
              <Link2 className="w-3.5 h-3.5 text-brand shrink-0" />
              <span className="flex-1 text-xs font-mono text-brand truncate">{inviteLink}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success("Link copied!"); }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-brand text-brand-foreground text-xs hover:opacity-90 transition-opacity"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
          )}

          {/* Pending invitations */}
          {pendingInvitations && pendingInvitations.filter((i: Record<string, unknown>) => i.status === "pending").length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Pending Invitations</p>
              {pendingInvitations
                .filter((i: Record<string, unknown>) => i.status === "pending")
                .map((inv: Record<string, unknown>) => (
                  <div key={inv.id as number} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/30">
                    <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{inv.email as string}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Expires {new Date(inv.expires_at as string).toLocaleDateString()}
                      </p>
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
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-muted/50 rounded w-32" />
                  <div className="h-2.5 bg-muted/30 rounded w-24" />
                </div>
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
                <div
                  key={userId}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-foreground/3 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center shrink-0 text-xs font-semibold text-brand">
                    {(user?.name ?? user?.email ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.name ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold ${ROLE_COLORS[role] ?? ""}`}>
                      <RoleIcon className="w-3 h-3" />
                      {ROLE_LABELS[role] ?? role}
                    </span>
                    {canAdmin && role !== "owner" && (
                      <>
                        <select
                          value={role}
                          onChange={(e) => updateRoleMutation.mutate({
                            workspaceId: activeWorkspace.id,
                            userId,
                            role: e.target.value as "admin" | "member" | "viewer",
                          })}
                          className="text-xs px-2 py-1 rounded-lg bg-background border border-border/50 focus:outline-none"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button
                          onClick={() => removeMutation.mutate({ workspaceId: activeWorkspace.id, userId })}
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

      {/* Transfer Ownership (owner only) */}
      {isOwner && (
        <div className="glass rounded-2xl p-5 border border-destructive/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-destructive">Transfer Ownership</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Transfer this workspace to another admin or member.</p>
            </div>
            <button
              onClick={() => setShowTransfer(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-destructive/40 text-destructive text-xs font-medium hover:bg-destructive/5 transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Transfer
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
                  <button
                    key={userId}
                    onClick={() => setTransferTargetId(userId)}
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
                <input
                  type="text"
                  value={transferConfirm}
                  onChange={(e) => setTransferConfirm(e.target.value)}
                  placeholder="TRANSFER"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30"
                />
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowTransfer(false)}
                className="flex-1 py-2 rounded-xl border border-border text-sm hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!transferTargetId || transferConfirm !== "TRANSFER" || transferMutation.isPending}
                onClick={() => {
                  if (transferTargetId) {
                    transferMutation.mutate({ workspaceId: activeWorkspace.id, newOwnerId: transferTargetId });
                  }
                }}
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

// ─── Brand Profile Tab ────────────────────────────────────────────────────────
function BrandProfileTab() {
  const { activeWorkspace, canAdmin } = useWorkspace();
  const utils = trpc.useUtils();

  const { data: profile } = trpc.workspaces.getBrandProfile.useQuery(
    { workspaceId: activeWorkspace?.id ?? 0 },
    { enabled: !!activeWorkspace }
  );

  const [tone, setTone] = useState(profile?.tone ?? "Professional");
  const [industry, setIndustry] = useState(profile?.industry ?? "");
  const [brandName, setBrandName] = useState(profile?.brand_name ?? "");
  const [brandDesc, setBrandDesc] = useState(profile?.brand_desc ?? "");
  const [brandGuidelines, setBrandGuidelines] = useState((profile as { brand_guidelines?: string } | undefined)?.brand_guidelines ?? "");
  const [keywords, setKeywords] = useState<string[]>(profile?.keywords ?? []);
  const [avoidWords, setAvoidWords] = useState<string[]>(profile?.avoid_words ?? []);
  const [newKeyword, setNewKeyword] = useState("");
  const [newAvoid, setNewAvoid] = useState("");

  // Sync state when profile loads
  const profileLoaded = !!profile;
  if (profileLoaded && tone === "Professional" && profile.tone !== "Professional") {
    setTone(profile.tone);
  }

  const upsertMutation = trpc.workspaces.upsertBrandProfile.useMutation({
    onSuccess: () => {
      toast.success("Brand profile saved");
      utils.workspaces.getBrandProfile.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!activeWorkspace) return null;

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword("");
    }
  };

  const addAvoid = () => {
    if (newAvoid.trim() && !avoidWords.includes(newAvoid.trim())) {
      setAvoidWords([...avoidWords, newAvoid.trim()]);
      setNewAvoid("");
    }
  };

  const handleSave = () => {
    upsertMutation.mutate({
      workspaceId: activeWorkspace.id,
      tone,
      industry: industry || undefined,
      brandName: brandName || undefined,
      brandDesc: brandDesc || undefined,
      brandGuidelines: brandGuidelines || undefined,
      keywords,
      avoidWords,
    });
  };

  return (
    <div className="space-y-5 max-w-lg">
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-brand" />
          <h3 className="text-sm font-semibold">AI Brand Identity</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          This profile helps the AI generate content that matches your brand voice and style.
        </p>

        {/* Brand Name */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Brand Name</label>
          <input
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            disabled={!canAdmin}
            placeholder="e.g. Acme Corp"
            className="w-full px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
          />
        </div>

        {/* Brand Description */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Brand Description</label>
          <textarea
            value={brandDesc}
            onChange={(e) => setBrandDesc(e.target.value)}
            disabled={!canAdmin}
            placeholder="Briefly describe what your brand does and who it serves..."
            rows={3}
            className="w-full px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60 resize-none"
          />
        </div>

        {/* Industry */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Industry</label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            disabled={!canAdmin}
            className="w-full px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
          >
            <option value="">Select industry...</option>
            {INDUSTRY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* Tone */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground font-medium">Brand Tone</label>
          <div className="flex flex-wrap gap-2">
            {TONE_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => canAdmin && setTone(t)}
                disabled={!canAdmin}
                className={[
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  tone === t
                    ? "bg-brand text-brand-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted",
                  !canAdmin ? "cursor-not-allowed opacity-60" : "",
                ].join(" ")}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Keywords */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <Tag className="w-3 h-3" />
            Brand Keywords
          </label>
          <div className="flex flex-wrap gap-1.5 min-h-8">
            {keywords.map((kw) => (
              <span key={kw} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand/10 text-brand text-xs">
                {kw}
                {canAdmin && (
                  <button onClick={() => setKeywords(keywords.filter((k) => k !== kw))}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </span>
            ))}
          </div>
          {canAdmin && (
            <div className="flex gap-2">
              <input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                placeholder="Add keyword..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-background border border-border/60 text-xs focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
              <button
                onClick={addKeyword}
                className="px-3 py-1.5 rounded-xl bg-brand/10 text-brand text-xs font-medium hover:bg-brand/20 transition-colors"
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* Avoid Words */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <X className="w-3 h-3 text-destructive" />
            Words to Avoid
          </label>
          <div className="flex flex-wrap gap-1.5 min-h-8">
            {avoidWords.map((w) => (
              <span key={w} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs">
                {w}
                {canAdmin && (
                  <button onClick={() => setAvoidWords(avoidWords.filter((a) => a !== w))}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </span>
            ))}
          </div>
          {canAdmin && (
            <div className="flex gap-2">
              <input
                value={newAvoid}
                onChange={(e) => setNewAvoid(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAvoid()}
                placeholder="Add word to avoid..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-background border border-border/60 text-xs focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
              <button
                onClick={addAvoid}
                className="px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* Brand Guidelines */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-brand" />
            Brand Guidelines
          </label>
          <p className="text-xs text-muted-foreground/70">
            Describe your brand voice, writing rules, and any instructions the AI must follow when generating content.
          </p>
          <textarea
            value={brandGuidelines}
            onChange={(e) => setBrandGuidelines(e.target.value.slice(0, 2000))}
            disabled={!canAdmin}
            placeholder={`e.g.\n- Always write in a friendly, conversational tone\n- Never use the word 'cheap' or 'discount'\n- Use short sentences and bullet points\n- Target audience: young professionals aged 25-35\n- Always end posts with a call-to-action`}
            rows={6}
            className="w-full px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60 resize-none leading-relaxed"
          />
          <p className="text-[11px] text-muted-foreground/50 text-right">{brandGuidelines.length}/2000</p>
        </div>

        {canAdmin && (
          <button
            onClick={handleSave}
            disabled={upsertMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Save className="w-3.5 h-3.5" />
            {upsertMutation.isPending ? "Saving..." : "Save Brand Profile"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Financials & Goals Tab ──────────────────────────────────────────────────
function FinancialsTab() {
  const { activeWorkspace, workspaceFinancials, refetchFinancials, canAdmin } = useWorkspace();
  const utils = trpc.useUtils();

  const [currency, setCurrency] = useState(workspaceFinancials?.currency ?? "USD");
  const [targetRoas, setTargetRoas] = useState(workspaceFinancials?.targetRoas ?? "3.0");
  const [monthlyBudget, setMonthlyBudget] = useState(workspaceFinancials?.monthlyBudget ?? "");
  const [saving, setSaving] = useState(false);

  // Sync when financials load
  useEffect(() => {
    if (workspaceFinancials) {
      setCurrency(workspaceFinancials.currency);
      setTargetRoas(workspaceFinancials.targetRoas);
      setMonthlyBudget(workspaceFinancials.monthlyBudget ?? "");
    }
  }, [workspaceFinancials?.currency, workspaceFinancials?.targetRoas, workspaceFinancials?.monthlyBudget]);

  const saveMutation = trpc.workspaces.saveOnboardingSettings.useMutation({
    onSuccess: () => {
      toast.success("Financial settings saved!");
      refetchFinancials();
      utils.workspaces.getOnboardingStatus.invalidate();
    },
    onError: (e) => toast.error(e.message),
    onSettled: () => setSaving(false),
  });

  const handleSave = () => {
    if (!activeWorkspace) return;
    const roasNum = parseFloat(targetRoas);
    if (isNaN(roasNum) || roasNum <= 0) {
      toast.error("Target ROAS must be a positive number");
      return;
    }
    setSaving(true);
    saveMutation.mutate({
      workspaceId: activeWorkspace.id,
      name: activeWorkspace.name,
      currency,
      targetRoas,
      monthlyBudget: monthlyBudget || undefined,
    });
  };

  if (!activeWorkspace) return null;

  const symbol = getCurrencySymbol(currency);

  return (
    <div className="space-y-6">
      {/* Currency */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Display Currency</h3>
            <p className="text-xs text-muted-foreground">All monetary values across the dashboard will use this currency symbol.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={!canAdmin}
              className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-50"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {getCurrencySymbol(c.code)} {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Preview</label>
            <div className="px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-sm">
              <span className="font-bold text-foreground">{symbol}1,234.56</span>
              <span className="text-muted-foreground ml-2">({currency})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Budget */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Monthly Ad Budget</h3>
            <p className="text-xs text-muted-foreground">Used in BudgetTracker to show spending vs. budget progress.</p>
          </div>
        </div>
        <div className="space-y-1.5 max-w-sm">
          <label className="text-xs font-medium text-muted-foreground">Monthly Budget ({currency})</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">{symbol}</span>
            <input
              type="number"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
              disabled={!canAdmin}
              placeholder="e.g. 10000"
              min="0"
              step="100"
              className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-muted border border-border text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-50"
            />
          </div>
          <p className="text-xs text-muted-foreground">Leave empty to hide the budget progress bar.</p>
        </div>
      </div>

      {/* Target ROAS */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Target ROAS</h3>
            <p className="text-xs text-muted-foreground">A reference line will appear on spend charts showing your ROAS target.</p>
          </div>
        </div>
        <div className="space-y-1.5 max-w-sm">
          <label className="text-xs font-medium text-muted-foreground">Target ROAS (multiplier)</label>
          <div className="relative">
            <input
              type="number"
              value={targetRoas}
              onChange={(e) => setTargetRoas(e.target.value)}
              disabled={!canAdmin}
              placeholder="e.g. 3.0"
              min="0.1"
              step="0.1"
              className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">x</span>
          </div>
          <div className="flex items-start gap-1.5 mt-2">
            <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              A ROAS of <strong>{parseFloat(targetRoas) || 3}x</strong> means for every {symbol}1 spent, you aim to earn {symbol}{parseFloat(targetRoas) || 3} in revenue.
            </p>
          </div>
        </div>
      </div>

      {/* Save button */}
      {canAdmin && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-brand-foreground/30 border-t-brand-foreground rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WorkspaceSettings() {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const { activeWorkspace, workspaces, isLoading } = useWorkspace();

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "general", label: "General", icon: Settings },
    { id: "team", label: "Team", icon: Users },
    { id: "brand", label: "Brand Profile", icon: Sparkles },
    { id: "financials", label: "Financials & Goals", icon: Target },
  ];

  return (
      <div className="p-6 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Workspace Settings</h1>
              <p className="text-sm text-muted-foreground">
                {activeWorkspace?.name ?? "No workspace selected"}
              </p>
            </div>
          </div>
        </div>

        {/* No workspace state */}
        {!isLoading && workspaces.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-base font-semibold mb-1">No Workspace Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first workspace to start managing your team and brand.
            </p>
            <CreateWorkspaceButton />
          </div>
        )}

        {/* Workspace content */}
        {activeWorkspace && (
          <>
            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-muted/30 p-1 rounded-xl w-fit">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    activeTab === tab.id
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === "general" && <GeneralTab />}
            {activeTab === "team" && <TeamTab />}
            {activeTab === "brand" && <BrandProfileTab />}
            {activeTab === "financials" && <FinancialsTab />}
          </>
        )}
      </div>
  );
}

// ─── Create Workspace Button ──────────────────────────────────────────────────
function CreateWorkspaceButton() {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const { refetch } = useWorkspace();

  const createMutation = trpc.workspaces.create.useMutation({
    onSuccess: () => {
      toast.success("Workspace created!");
      setShow(false);
      setName("");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 transition-opacity mx-auto"
      >
        <Plus className="w-4 h-4" />
        Create Workspace
      </button>
    );
  }

  return (
    <div className="flex gap-2 max-w-sm mx-auto">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Workspace name..."
        autoFocus
        className="flex-1 px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
      <button
        onClick={() => createMutation.mutate({ name })}
        disabled={!name.trim() || createMutation.isPending}
        className="px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {createMutation.isPending ? "..." : "Create"}
      </button>
      <button
        onClick={() => setShow(false)}
        className="px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
