/**
 * layout-parts/SwitcherModals.tsx — Workspace and Account switcher modals.
 */
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { useTranslation } from "react-i18next";
import { X, Globe2, Settings, Check, PlusCircle, Building2 } from "lucide-react";
import { useLocation } from "wouter";
import type { WorkspaceItem } from "@/core/contexts/WorkspaceContext";
import type { SocialAccount } from "./helpers";
import { PLATFORM_ICONS } from "./helpers";

function PlatformIcon({ platform, className = "w-3.5 h-3.5" }: { platform: string; className?: string }) {
  const Icon = PLATFORM_ICONS[platform] ?? Globe2;
  return <Icon className={className} />;
}

// ─── Workspace Switcher Modal ───────────────────────────────────────────────
export function WorkspaceSwitcherModal({
  workspaces, active, onSelect, onClose,
}: {
  workspaces: WorkspaceItem[];
  active: WorkspaceItem | null;
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  const [, setLocation] = useLocation();
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-strong rounded-2xl w-full max-w-sm mx-4 mb-4 md:mb-0 p-4 shadow-2xl animate-blur-in">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Switch Workspace</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-foreground/8 transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        {workspaces.length === 0 ? (
          <div className="py-6 text-center">
            <Building2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No workspaces yet</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {workspaces.map(ws => (
              <button key={ws.id} onClick={() => onSelect(ws.id)}
                className={["w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors",
                  active?.id === ws.id ? "bg-brand/10 border border-brand/20" : "hover:bg-foreground/5",
                ].join(" ")}>
                <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {ws.logo_url ? (
                    <img src={ws.logo_url} alt={ws.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-brand uppercase leading-none">{ws.name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{ws.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate capitalize">{ws.plan} · {ws.role}</p>
                </div>
                {active?.id === ws.id && <Check className="w-3.5 h-3.5 text-brand shrink-0" />}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 mt-3">
          <button onClick={() => { setLocation("/workspace-settings"); onClose(); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground hover:text-foreground hover:border-border transition-colors">
            <Settings className="w-3.5 h-3.5" /> Workspace Settings
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Account Switcher Modal ───────────────────────────────────────────────────
export function AccountSwitcherModal({
  accounts, active, onSelect, onClose,
}: {
  accounts: SocialAccount[];
  active: SocialAccount | null;
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  const grouped = accounts.reduce<Record<string, SocialAccount[]>>((acc, a) => {
    if (!acc[a.platform]) acc[a.platform] = [];
    acc[a.platform].push(a);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-strong rounded-2xl w-full max-w-sm mx-4 mb-4 md:mb-0 p-4 shadow-2xl animate-blur-in">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">{t("topbar.switchAccount")}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-foreground/8 transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        {accounts.length === 0 ? (
          <div className="py-6 text-center">
            <Globe2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t("topbar.noAccounts")}</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {Object.entries(grouped).map(([platform, accs]) => (
              <div key={platform}>
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/40 px-1 mb-1.5 flex items-center gap-1.5">
                  <PlatformIcon platform={platform} className="w-3 h-3" />
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </p>
                {accs.map(acc => (
                  <button key={acc.id} onClick={() => { onSelect(acc.id); onClose(); }}
                    className={["w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors",
                      active?.id === acc.id ? "bg-brand/10 border border-brand/20" : "hover:bg-foreground/5",
                    ].join(" ")}>
                    <Avatar className="w-7 h-7 shrink-0">
                      {acc.profile_picture && <AvatarImage src={acc.profile_picture} />}
                      <AvatarFallback className="text-[10px] bg-brand/10 text-brand font-semibold">
                        {(acc.name ?? acc.username ?? platform).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{acc.name ?? acc.username ?? platform}</p>
                      {acc.account_type && <p className="text-[10px] text-muted-foreground truncate">{acc.account_type}</p>}
                    </div>
                    {active?.id === acc.id && <Check className="w-3.5 h-3.5 text-brand shrink-0" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
        <button onClick={() => { setLocation("/connections"); onClose(); }}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground hover:text-foreground hover:border-border transition-colors">
          <PlusCircle className="w-3.5 h-3.5" /> {t("topbar.connectAccount")}
        </button>
      </div>
    </div>
  );
}
