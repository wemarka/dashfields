// client/src/features/team/TeamPage.tsx
// Dedicated Team Management page — full member management, invite flows, role controls.
import { useState } from "react";
import {
  Users, UserPlus, Mail, Link2, Crown, Shield, Eye, MoreVertical,
  Trash2, UserCheck, Clock, CheckCircle2, XCircle, Copy, RefreshCw,
  Search, ChevronDown, AlertCircle,
} from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/core/components/ui/dialog";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/core/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { useAuth } from "@/shared/hooks/useAuth";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { toast } from "sonner";
import { PLAN_LIMITS } from "@shared/planLimits";

// ─── Role Config ─────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  owner: {
    label: "Owner",
    icon: Crown,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    description: "Full access, cannot be removed",
  },
  admin: {
    label: "Admin",
    icon: Shield,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    description: "Can manage members, settings, and all content",
  },
  member: {
    label: "Member",
    icon: UserCheck,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    description: "Can create and manage content",
  },
  viewer: {
    label: "Viewer",
    icon: Eye,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    description: "Read-only access to analytics and reports",
  },
} as const;

type Role = keyof typeof ROLE_CONFIG;

// ─── Invite Modal ─────────────────────────────────────────────────────────────
function InviteModal({
  open,
  onClose,
  workspaceId,
}: {
  open: boolean;
  onClose: () => void;
  workspaceId: number;
}) {
  const [tab, setTab] = useState<"email" | "link">("email");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "viewer">("member");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const addMutation = trpc.workspaces.addMemberByEmail.useMutation({
    onSuccess: () => {
      toast.success("Member added successfully");
      utils.workspaces.listMembers.invalidate();
      setEmail("");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const inviteMutation = trpc.invitations.invite.useMutation({
    onSuccess: (data) => {
      setGeneratedLink(data.inviteUrl);
      utils.invitations.list.invalidate();
      toast.success("Invite link generated");
    },
    onError: (e) => toast.error(e.message),
  });

  const copyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast.success("Link copied to clipboard");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Add someone to your workspace to collaborate on campaigns and content.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "email" | "link")}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="email" className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              By Email
            </TabsTrigger>
            <TabsTrigger value="link" className="flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" />
              Invite Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The user must already have a Dashfields account.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["admin", "member", "viewer"] as const).map((r) => {
                    const cfg = ROLE_CONFIG[r];
                    const Icon = cfg.icon;
                    return (
                      <SelectItem key={r} value={r}>
                        <div className="flex items-center gap-2">
                          <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                          <span>{cfg.label}</span>
                          <span className="text-muted-foreground text-xs">— {cfg.description}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={() => addMutation.mutate({ workspaceId, email, role })}
              disabled={!email || addMutation.isPending}
            >
              {addMutation.isPending ? "Adding..." : "Add Member"}
            </Button>
          </TabsContent>

          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Recipient Email (for tracking)</Label>
              <Input
                type="email"
                placeholder="recipient@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["admin", "member", "viewer"] as const).map((r) => {
                    const cfg = ROLE_CONFIG[r];
                    const Icon = cfg.icon;
                    return (
                      <SelectItem key={r} value={r}>
                        <div className="flex items-center gap-2">
                          <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                          <span>{cfg.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {!generatedLink ? (
              <Button
                className="w-full"
                onClick={() =>
                  inviteMutation.mutate({
                    workspaceId,
                    email,
                    role,
                    origin: window.location.origin,
                  })
                }
                disabled={!email || inviteMutation.isPending}
              >
                <Link2 className="w-4 h-4 mr-2" />
                {inviteMutation.isPending ? "Generating..." : "Generate Invite Link"}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-brand/5 border border-brand/20">
                  <Link2 className="w-3.5 h-3.5 text-brand shrink-0" />
                  <span className="text-xs text-muted-foreground flex-1 truncate">{generatedLink}</span>
                  <button
                    onClick={copyLink}
                    className="p-1.5 rounded-lg hover:bg-brand/10 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-brand" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Link expires in 7 days. Share it securely.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setGeneratedLink(null)}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-2" />
                  Generate New Link
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── Member Card ──────────────────────────────────────────────────────────────
function MemberCard({
  member,
  currentUserId,
  canAdmin,
  workspaceId,
}: {
  member: {
    id: number;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
    role: string;
    joined_at: string | null;
  };
  currentUserId: number;
  canAdmin: boolean;
  workspaceId: number;
}) {
  const utils = trpc.useUtils();
  const roleCfg = ROLE_CONFIG[member.role as Role] ?? ROLE_CONFIG.member;
  const RoleIcon = roleCfg.icon;
  const isCurrentUser = member.id === currentUserId;
  const isOwner = member.role === "owner";

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

  const initials = (member.name ?? member.email ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-foreground/3 transition-colors group">
      <Avatar className="w-9 h-9 shrink-0">
        <AvatarImage src={member.avatar_url ?? undefined} />
        <AvatarFallback className="text-xs font-semibold bg-brand/10 text-brand">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {member.name ?? member.email ?? "Unknown"}
          </span>
          {isCurrentUser && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand/10 text-brand font-medium">
              You
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
      </div>

      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${roleCfg.bg} ${roleCfg.border} ${roleCfg.color}`}>
        <RoleIcon className="w-3 h-3" />
        {roleCfg.label}
      </div>

      {canAdmin && !isOwner && !isCurrentUser && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-foreground/8 transition-all">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">Change Role</div>
            {(["admin", "member", "viewer"] as const).map((r) => {
              if (r === member.role) return null;
              const cfg = ROLE_CONFIG[r];
              const Icon = cfg.icon;
              return (
                <DropdownMenuItem
                  key={r}
                  onClick={() => updateRoleMutation.mutate({ workspaceId, userId: member.id, role: r })}
                  className="flex items-center gap-2"
                >
                  <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  Make {cfg.label}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => removeMutation.mutate({ workspaceId, userId: member.id })}
              className="text-red-500 focus:text-red-500 flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove Member
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TeamPage() {
  usePageTitle("Team");
  const { activeWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: members = [], isLoading } = trpc.workspaces.listMembers.useQuery(
    { workspaceId: activeWorkspace?.id ?? 0 },
    { enabled: !!activeWorkspace }
  );

  const { data: pendingInvitations = [] } = trpc.invitations.list.useQuery(
    { workspaceId: activeWorkspace?.id ?? 0 },
    { enabled: !!activeWorkspace }
  );

  const utils = trpc.useUtils();
  const revokeMutation = trpc.invitations.revoke.useMutation({
    onSuccess: () => {
      toast.success("Invitation revoked");
      utils.invitations.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!activeWorkspace) return null;

  const myRole = members.find((m) => m.id === user?.id)?.role ?? "member";
  const canAdmin = ["owner", "admin"].includes(myRole);
  const plan = (activeWorkspace as { plan?: string }).plan ?? "free";
  const planLimits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.free;
  const memberLimit = planLimits.maxTeamMembers;
  const isAtLimit = memberLimit !== Infinity && members.length >= memberLimit;

  const filteredMembers = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      (m.name ?? "").toLowerCase().includes(q) ||
      (m.email ?? "").toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q)
    );
  });

  const roleGroups: Record<string, typeof members> = {
    owner: filteredMembers.filter((m) => m.role === "owner"),
    admin: filteredMembers.filter((m) => m.role === "admin"),
    member: filteredMembers.filter((m) => m.role === "member"),
    viewer: filteredMembers.filter((m) => m.role === "viewer"),
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage who has access to <span className="font-medium text-foreground">{activeWorkspace.name}</span>
          </p>
        </div>
        {canAdmin && (
          <Button
            onClick={() => setInviteOpen(true)}
            disabled={isAtLimit}
            className="shrink-0"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Plan limit warning */}
      {isAtLimit && canAdmin && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="text-sm">
            You've reached the <strong>{memberLimit}-member</strong> limit on your {planLimits.name} plan.
            {" "}<a href="/billing" className="underline underline-offset-2 font-medium">Upgrade to add more members.</a>
          </p>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Members", value: members.length, icon: Users, color: "text-brand", bg: "bg-brand/10" },
          { label: "Pending Invites", value: pendingInvitations.filter((i) => i.status === "pending").length, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Plan Limit", value: memberLimit === Infinity ? "∞" : `${members.length}/${memberLimit}`, icon: Shield, color: "text-purple-500", bg: "bg-purple-500/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="glass">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
                <Icon className={`w-4.5 h-4.5 ${color}`} />
              </div>
              <div>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search members by name, email, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Members List */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-brand" />
            Members
            <Badge variant="secondary" className="ml-auto font-normal">{members.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-1 p-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-muted rounded w-32" />
                    <div className="h-3 bg-muted rounded w-48" />
                  </div>
                  <div className="h-6 w-16 bg-muted rounded-full" />
                </div>
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {search ? "No members match your search" : "No members yet"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {(["owner", "admin", "member", "viewer"] as const).map((role) => {
                const group = roleGroups[role];
                if (!group || group.length === 0) return null;
                const cfg = ROLE_CONFIG[role];
                return (
                  <div key={role}>
                    <div className="px-4 py-2 flex items-center gap-2">
                      <span className={`text-xs font-semibold uppercase tracking-wider ${cfg.color}`}>
                        {cfg.label}s
                      </span>
                      <span className="text-xs text-muted-foreground">({group.length})</span>
                    </div>
                    {group.map((m) => (
                      <MemberCard
                        key={m.id}
                        member={m}
                        currentUserId={user?.id ?? 0}
                        canAdmin={canAdmin}
                        workspaceId={activeWorkspace.id}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {canAdmin && pendingInvitations.filter((i) => i.status === "pending").length > 0 && (
        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Pending Invitations
              <Badge variant="secondary" className="ml-auto font-normal bg-amber-500/10 text-amber-600 border-amber-500/20">
                {pendingInvitations.filter((i) => i.status === "pending").length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {pendingInvitations
                .filter((i) => i.status === "pending")
                .map((inv) => {
                  const roleCfg = ROLE_CONFIG[inv.role as Role] ?? ROLE_CONFIG.member;
                  const RoleIcon = roleCfg.icon;
                  const expiresAt = inv.expires_at ? new Date(inv.expires_at) : null;
                  const isExpired = expiresAt ? expiresAt < new Date() : false;
                  return (
                    <div key={inv.id} className="flex items-center gap-3 p-4 group">
                      <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{inv.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {isExpired ? (
                            <span className="text-red-500">Expired</span>
                          ) : expiresAt ? (
                            `Expires ${expiresAt.toLocaleDateString()}`
                          ) : "Pending"}
                        </p>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${roleCfg.bg} ${roleCfg.border} ${roleCfg.color}`}>
                        <RoleIcon className="w-3 h-3" />
                        {roleCfg.label}
                      </div>
                      <button
                        onClick={() => revokeMutation.mutate({ invitationId: inv.id, workspaceId: activeWorkspace.id })}
                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
                        title="Revoke invitation"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role Permissions Reference */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand" />
            Role Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Permission</th>
                  {(["owner", "admin", "member", "viewer"] as const).map((r) => {
                    const cfg = ROLE_CONFIG[r];
                    const Icon = cfg.icon;
                    return (
                      <th key={r} className="text-center py-2 px-3">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {[
                  ["View Analytics", true, true, true, true],
                  ["Create & Edit Content", true, true, true, false],
                  ["Manage Campaigns", true, true, true, false],
                  ["Export Reports", true, true, false, false],
                  ["Manage Members", true, true, false, false],
                  ["Workspace Settings", true, true, false, false],
                  ["Billing & Plans", true, false, false, false],
                  ["Delete Workspace", true, false, false, false],
                ].map(([perm, ...values]) => (
                  <tr key={perm as string}>
                    <td className="py-2.5 pr-4 text-sm text-muted-foreground">{perm}</td>
                    {(values as boolean[]).map((v, i) => (
                      <td key={i} className="text-center py-2.5 px-3">
                        {v ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Invite Modal */}
      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        workspaceId={activeWorkspace.id}
      />
    </div>
  );
}
