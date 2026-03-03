/**
 * WorkspaceSettings.tsx
 * Workspace management page with 3 tabs:
 *  1. General — name, logo, plan
 *  2. Team — members list, roles, add member
 *  3. Brand Profile — AI brand identity settings
 */
import { useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import {
  Building2, Users, Sparkles, Settings, Trash2,
  ChevronDown, Plus, Shield, Eye, UserCheck, Crown,
  Tag, X, Save, AlertTriangle, Link2, Copy, MailPlus,
  Clock, CheckCircle2, Ban, Upload, ImageIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type TabId = "general" | "team" | "brand";

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
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"admin" | "member" | "viewer">("member");
  const utils = trpc.useUtils();

  const { data: members, isLoading } = trpc.workspaces.listMembers.useQuery(
    { workspaceId: activeWorkspace?.id ?? 0 },
    { enabled: !!activeWorkspace }
  );

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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WorkspaceSettings() {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const { activeWorkspace, workspaces, isLoading } = useWorkspace();

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "general", label: "General", icon: Settings },
    { id: "team", label: "Team", icon: Users },
    { id: "brand", label: "Brand Profile", icon: Sparkles },
  ];

  return (
    <DashboardLayout>
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
          </>
        )}
      </div>
    </DashboardLayout>
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
