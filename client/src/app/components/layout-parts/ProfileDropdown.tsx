/**
 * layout-parts/ProfileDropdown.tsx — User profile dropdown with workspace switching.
 */
import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback } from "@/core/components/ui/avatar";
import { useTranslation } from "react-i18next";
import { PLAN_LIMITS, type WorkspacePlan } from "@shared/planLimits";
import {
  LogOut, User, ChevronDown, Check, PlusCircle, Building2, CreditCard, Settings2,
} from "lucide-react";
import { useLocation } from "wouter";
import type { WorkspaceItem } from "@/core/contexts/WorkspaceContext";

export function ProfileDropdown({
  user, onLogout, workspaces, activeWorkspace, onSelectWorkspace, onNewWorkspace, onOpenAppSettings,
}: {
  user: { name?: string; email?: string };
  onLogout: () => void;
  workspaces: WorkspaceItem[];
  activeWorkspace: WorkspaceItem | null;
  onSelectWorkspace: (id: number) => void;
  onNewWorkspace: () => void;
  onOpenAppSettings?: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className={["flex items-center gap-1.5 p-1 rounded-xl transition-all duration-200",
          open ? "bg-foreground/8" : "hover:bg-foreground/5",
        ].join(" ")}>
        <div className="relative">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-[12px] bg-brand/10 text-brand font-bold">{initials}</AvatarFallback>
          </Avatar>
          {activeWorkspace && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-sm bg-background border border-border/60 flex items-center justify-center overflow-hidden shadow-sm">
              {activeWorkspace.logo_url ? (
                <img src={activeWorkspace.logo_url} alt={activeWorkspace.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[7px] font-black text-brand uppercase leading-none">{activeWorkspace.name.charAt(0)}</span>
              )}
            </div>
          )}
        </div>
        <ChevronDown className={`w-3 h-3 text-muted-foreground/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 glass-strong rounded-2xl shadow-2xl border border-border/40 z-50 overflow-hidden animate-blur-in">
          {/* User info header */}
          <div className="px-4 py-3.5 flex items-center gap-3 border-b border-border/30">
            <Avatar className="w-9 h-9 shrink-0">
              <AvatarFallback className="text-sm bg-brand/10 text-brand font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.name ?? "User"}</p>
              {user?.email && <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>}
            </div>
          </div>

          {/* Workspace section */}
          <div className="px-2 pt-2 pb-1">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/40 px-2 mb-1.5">Workspaces</p>
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {workspaces.length === 0 ? (
                <div className="py-3 text-center"><p className="text-xs text-muted-foreground">No workspaces yet</p></div>
              ) : (
                workspaces.map(ws => {
                  const isActive = activeWorkspace?.id === ws.id;
                  const planCfg = PLAN_LIMITS[ws.plan as WorkspacePlan];
                  return (
                    <button key={ws.id} onClick={() => { onSelectWorkspace(ws.id); setOpen(false); }}
                      className={["w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all duration-150",
                        isActive ? "bg-brand/8 border border-brand/15" : "hover:bg-foreground/5",
                      ].join(" ")}>
                      <div className={["w-7 h-7 rounded-lg flex items-center justify-center shrink-0 overflow-hidden",
                        isActive ? "bg-brand/15" : "bg-foreground/8",
                      ].join(" ")}>
                        {ws.logo_url ? (
                          <img src={ws.logo_url} alt={ws.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className={`text-[11px] font-black uppercase leading-none ${isActive ? "text-brand" : "text-foreground/60"}`}>{ws.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${isActive ? "text-foreground" : "text-foreground/80"}`}>{ws.name}</p>
                        {planCfg && <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${planCfg.badge.color}`}>{planCfg.badge.label}</span>}
                      </div>
                      {isActive && <Check className="w-3.5 h-3.5 text-brand shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
            <button onClick={() => { onNewWorkspace(); setOpen(false); }}
              className="mt-1 w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors border border-dashed border-border/40 hover:border-border/70">
              <PlusCircle className="w-3.5 h-3.5" /> New workspace
            </button>
          </div>

          <div className="border-t border-border/30 mx-2" />

          {/* Actions */}
          <div className="px-2 py-1.5 space-y-0.5">
            <button onClick={() => { setLocation("/profile"); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm hover:bg-foreground/5 transition-colors text-foreground/80 hover:text-foreground">
              <User className="w-3.5 h-3.5 text-muted-foreground" /> {t("topbar.viewProfile")}
            </button>
            <button onClick={() => { setLocation("/settings/workspace"); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm hover:bg-foreground/5 transition-colors text-foreground/80 hover:text-foreground">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" /> Workspace &amp; Team
            </button>
            <button onClick={() => { setLocation("/settings/billing"); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm hover:bg-foreground/5 transition-colors text-foreground/80 hover:text-foreground">
              <CreditCard className="w-3.5 h-3.5 text-muted-foreground" /> {t("topbar.billing", "Billing & Plans")}
            </button>
            {onOpenAppSettings && (
              <button onClick={() => { onOpenAppSettings(); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm hover:bg-foreground/5 transition-colors text-foreground/80 hover:text-foreground">
                <Settings2 className="w-3.5 h-3.5 text-muted-foreground" /> App Settings
              </button>
            )}
          </div>

          <div className="border-t border-border/30 mx-2 mb-1" />
          <div className="px-2 pb-2">
            <button onClick={() => { onLogout(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm text-destructive hover:bg-destructive/8 transition-colors">
              <LogOut className="w-3.5 h-3.5" /> {t("topbar.signOut")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
