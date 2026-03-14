/**
 * team/components/MemberCard.tsx — Individual team member card with role management.
 */
import { MoreVertical, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { ROLE_CONFIG, type Role, type MemberData } from "./constants";

interface Props {
  member: MemberData;
  currentUserId: number;
  canAdmin: boolean;
  workspaceId: number;
}

export function MemberCard({ member, currentUserId, canAdmin, workspaceId }: Props) {
  const utils = trpc.useUtils();
  const roleCfg = ROLE_CONFIG[member.role as Role] ?? ROLE_CONFIG.member;
  const RoleIcon = roleCfg.icon;
  const isCurrentUser = member.id === currentUserId;
  const isOwner = member.role === "owner";

  const updateRoleMutation = trpc.workspaces.updateMemberRole.useMutation({
    onSuccess: () => { toast.success("Role updated"); utils.workspaces.listMembers.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const removeMutation = trpc.workspaces.removeMember.useMutation({
    onSuccess: () => { toast.success("Member removed"); utils.workspaces.listMembers.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const initials = (member.name ?? member.email ?? "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-foreground/3 transition-colors group">
      <Avatar className="w-9 h-9 shrink-0">
        <AvatarImage src={member.avatar_url ?? undefined} />
        <AvatarFallback className="text-xs font-semibold bg-brand/10 text-brand">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{member.name ?? member.email ?? "Unknown"}</span>
          {isCurrentUser && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand/10 text-brand font-medium">You</span>}
        </div>
        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
      </div>

      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${roleCfg.bg} ${roleCfg.border} ${roleCfg.color}`}>
        <RoleIcon className="w-3 h-3" /> {roleCfg.label}
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
              const cfg = ROLE_CONFIG[r]; const Icon = cfg.icon;
              return (
                <DropdownMenuItem key={r} onClick={() => updateRoleMutation.mutate({ workspaceId, userId: member.id, role: r })} className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${cfg.color}`} /> Make {cfg.label}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => removeMutation.mutate({ workspaceId, userId: member.id })} className="text-[#f87171] focus:text-[#f87171] flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5" /> Remove Member
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
