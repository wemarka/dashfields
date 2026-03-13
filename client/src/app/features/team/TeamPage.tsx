/**
 * TeamPage.tsx — Main team management page orchestrator.
 * Sub-components live in ./components/.
 */
import { useState } from "react";
import {
  Users, UserPlus, Mail, Shield, Clock, CheckCircle2, XCircle, Search, AlertCircle,
} from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Input } from "@/core/components/ui/input";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { useAuth } from "@/shared/hooks/useAuth";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { toast } from "sonner";
import { PLAN_LIMITS } from "@shared/planLimits";
import { InviteModal, MemberCard, ROLE_CONFIG, type Role } from "./components";

export default function TeamPage() {
  usePageTitle("Team");
  const { activeWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: members = [], isLoading } = trpc.workspaces.listMembers.useQuery(
    { workspaceId: activeWorkspace?.id ?? 0 }, { enabled: !!activeWorkspace }
  );
  const { data: pendingInvitations = [] } = trpc.invitations.list.useQuery(
    { workspaceId: activeWorkspace?.id ?? 0 }, { enabled: !!activeWorkspace }
  );

  const utils = trpc.useUtils();
  const revokeMutation = trpc.invitations.revoke.useMutation({
    onSuccess: () => { toast.success("Invitation revoked"); utils.invitations.list.invalidate(); },
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
    return (m.name ?? "").toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q) || m.role.toLowerCase().includes(q);
  });

  const roleGroups: Record<string, typeof members> = {
    owner: filteredMembers.filter((m) => m.role === "owner"),
    admin: filteredMembers.filter((m) => m.role === "admin"),
    member: filteredMembers.filter((m) => m.role === "member"),
    viewer: filteredMembers.filter((m) => m.role === "viewer"),
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage who has access to <span className="font-medium text-foreground">{activeWorkspace.name}</span></p>
        </div>
        {canAdmin && (
          <Button onClick={() => setInviteOpen(true)} disabled={isAtLimit} className="shrink-0">
            <UserPlus className="w-4 h-4 mr-2" /> Invite Member
          </Button>
        )}
      </div>

      {isAtLimit && canAdmin && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="text-sm">You've reached the <strong>{memberLimit}-member</strong> limit on your {planLimits.name} plan. <a href="/billing" className="underline underline-offset-2 font-medium">Upgrade to add more members.</a></p>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Members", value: members.length, icon: Users, color: "text-brand", bg: "bg-brand/10" },
          { label: "Pending Invites", value: pendingInvitations.filter((i) => i.status === "pending").length, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Plan Limit", value: memberLimit === Infinity ? "\u221E" : `${members.length}/${memberLimit}`, icon: Shield, color: "text-purple-500", bg: "bg-purple-500/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="glass">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}><Icon className={`w-4.5 h-4.5 ${color}`} /></div>
              <div><p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search members by name, email, or role..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Members List */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-brand" /> Members
            <Badge variant="secondary" className="ml-auto font-normal">{members.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-1 p-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1.5"><div className="h-3.5 bg-muted rounded w-32" /><div className="h-3 bg-muted rounded w-48" /></div>
                  <div className="h-6 w-16 bg-muted rounded-full" />
                </div>
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{search ? "No members match your search" : "No members yet"}</p>
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
                      <span className={`text-xs font-semibold uppercase tracking-wider ${cfg.color}`}>{cfg.label}s</span>
                      <span className="text-xs text-muted-foreground">({group.length})</span>
                    </div>
                    {group.map((m) => (
                      <MemberCard key={m.id} member={m} currentUserId={user?.id ?? 0} canAdmin={canAdmin} workspaceId={activeWorkspace.id} />
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
              <Clock className="w-4 h-4 text-amber-500" /> Pending Invitations
              <Badge variant="secondary" className="ml-auto font-normal bg-amber-500/10 text-amber-600 border-amber-500/20">{pendingInvitations.filter((i) => i.status === "pending").length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {pendingInvitations.filter((i) => i.status === "pending").map((inv) => {
                const roleCfg = ROLE_CONFIG[inv.role as Role] ?? ROLE_CONFIG.member;
                const RoleIcon = roleCfg.icon;
                const expiresAt = inv.expires_at ? new Date(inv.expires_at) : null;
                const isExpired = expiresAt ? expiresAt < new Date() : false;
                return (
                  <div key={inv.id} className="flex items-center gap-3 p-4 group">
                    <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0"><Mail className="w-4 h-4 text-amber-500" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">{isExpired ? <span className="text-red-500">Expired</span> : expiresAt ? `Expires ${expiresAt.toLocaleDateString()}` : "Pending"}</p>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${roleCfg.bg} ${roleCfg.border} ${roleCfg.color}`}><RoleIcon className="w-3 h-3" /> {roleCfg.label}</div>
                    <button onClick={() => revokeMutation.mutate({ invitationId: inv.id, workspaceId: activeWorkspace.id })} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all" title="Revoke invitation">
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
          <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-brand" /> Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Permission</th>
                  {(["owner", "admin", "member", "viewer"] as const).map((r) => {
                    const cfg = ROLE_CONFIG[r]; const Icon = cfg.icon;
                    return <th key={r} className="text-center py-2 px-3"><div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}><Icon className="w-3 h-3" />{cfg.label}</div></th>;
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
                      <td key={i} className="text-center py-2.5 px-3">{v ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <XCircle className="w-4 h-4 text-muted-foreground/30 mx-auto" />}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} workspaceId={activeWorkspace.id} />
    </div>
  );
}
