// DashboardLayout.tsx
// Main app shell — redesigned with:
//  • Lean Sidebar (grouped, no cognitive overload)
//  • Profile Dropdown in Topbar (avatar → Profile, Settings, Logout)
//  • Account Switcher at Sidebar bottom (per-platform, multi-account)
import { useAuth } from "@/_core/hooks/useAuth";
import { DashfieldsIcon, DashfieldsLogoFull } from "@/components/DashfieldsLogo";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { getLoginUrl } from "@/const";
import { trpc } from "@/core/lib/trpc";
import { NotificationBell } from "@/components/NotificationBell";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "@/core/i18n";
import { UpgradeModal } from "@/features/billing/UpgradeModal";
import { PLAN_LIMITS, type WorkspacePlan } from "../../../shared/planLimits";
import {
  BarChart3, Bell, CalendarDays, ChevronLeft, ChevronRight,
  LayoutDashboard, LogOut, Megaphone, Settings, Sparkles,
  Link2, Globe2, FileText, Users, User, Swords,
  Sun, Moon, ChevronDown, Check, PlusCircle,
  FlaskConical, SplitSquareHorizontal, LayoutGrid, X,
  Facebook, Instagram, Linkedin, Twitter, Youtube, Building2,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useActiveAccount } from "@/core/contexts/ActiveAccountContext";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { useLocation } from "wouter";

// ─── Dark Mode Hook ───────────────────────────────────────────────────────────
function useDarkMode() {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("dashfields-theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("dashfields-theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("dashfields-theme", "light");
    }
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

// ─── Types ────────────────────────────────────────────────────────────────────
type SocialAccount = {
  id: number;
  platform: string;
  name: string | null;
  username: string | null;
  account_type: string | null;
  is_active: boolean | null;
  profile_picture: string | null;
};

type NavItem = { icon: React.ElementType; labelKey: string; path: string; iconAnimation?: string };
type NavGroup = { labelKey: string | null; items: NavItem[] };

// ─── Platform helpers ─────────────────────────────────────────────────────────
const PLATFORM_ICONS: Record<string, React.ElementType> = {
  facebook: Facebook, instagram: Instagram, linkedin: Linkedin,
  twitter: Twitter, youtube: Youtube,
};
const PLATFORM_COLORS: Record<string, string> = {
  facebook: "text-blue-500", instagram: "text-pink-500",
  linkedin: "text-blue-600", twitter: "text-sky-400",
  youtube: "text-red-500",
};
function PlatformIcon({ platform, className = "w-3.5 h-3.5" }: { platform: string; className?: string }) {
  const Icon = PLATFORM_ICONS[platform] ?? Globe2;
  const color = PLATFORM_COLORS[platform] ?? "text-muted-foreground";
  return <Icon className={`${className} ${color}`} />;
}

// useActiveAccount is now provided by ActiveAccountContext

// ─── Nav Structure (lean — 5 groups, ~13 items) ───────────────────────────────
const navGroups: NavGroup[] = [
  {
    labelKey: null,
    items: [
      { icon: LayoutDashboard, labelKey: "nav.dashboard", path: "/", iconAnimation: "icon-bounce" },
    ],
  },
  {
    labelKey: "nav.groups.advertising",
    items: [
      { icon: Megaphone, labelKey: "nav.campaigns", path: "/campaigns", iconAnimation: "icon-shake" },
      { icon: Bell,      labelKey: "nav.alerts",    path: "/alerts",    iconAnimation: "icon-bounce" },
    ],
  },
  {
    labelKey: "nav.groups.content",
    items: [
      { icon: CalendarDays, labelKey: "nav.calendar",  path: "/calendar",   iconAnimation: "icon-bounce" },
      { icon: Sparkles,     labelKey: "nav.aiStudio",  path: "/ai-content", iconAnimation: "icon-pop" },
    ],
  },
  {
    labelKey: "nav.groups.analytics",
    items: [
      { icon: BarChart3, labelKey: "nav.overview",    path: "/analytics",   iconAnimation: "icon-pop" },
      { icon: Users,     labelKey: "nav.audience",    path: "/audience",    iconAnimation: "icon-bounce" },
      { icon: Swords,    labelKey: "nav.competitors", path: "/competitors", iconAnimation: "icon-shake" },
    ],
  },
  {
    labelKey: "nav.groups.reports",
    items: [
      { icon: FileText, labelKey: "nav.reports",     path: "/reports",     iconAnimation: "icon-bounce" },
      { icon: Link2,    labelKey: "nav.connections", path: "/connections", iconAnimation: "icon-pop" },
    ],
  },
  {
    labelKey: "nav.groups.tools",
    items: [
      { icon: SplitSquareHorizontal, labelKey: "nav.abTesting",        path: "/ab-testing",        iconAnimation: "icon-spin" },
      { icon: LayoutGrid,            labelKey: "nav.customDashboards",  path: "/custom-dashboards", iconAnimation: "icon-bounce" },
      { icon: FlaskConical,          labelKey: "nav.advancedAnalytics", path: "/advanced-analytics", iconAnimation: "icon-pop" },
    ],
  },
];

// ─── Workspace Switcher Modal ───────────────────────────────────────────────
import type { WorkspaceItem } from "@/core/contexts/WorkspaceContext";
function WorkspaceSwitcherModal({
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
              <button
                key={ws.id}
                onClick={() => onSelect(ws.id)}
                className={[
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors",
                  active?.id === ws.id ? "bg-brand/10 border border-brand/20" : "hover:bg-foreground/5",
                ].join(" ")}
              >
                <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {ws.logo_url ? (
                    <img src={ws.logo_url} alt={ws.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-brand uppercase leading-none">
                      {ws.name.charAt(0)}
                    </span>
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
          <button
            onClick={() => { setLocation("/workspace-settings"); onClose(); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Workspace Settings
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Account Switcher Modal ───────────────────────────────────────────────────
function AccountSwitcherModal({
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
                  <button
                    key={acc.id}
                    onClick={() => { onSelect(acc.id); onClose(); }}
                    className={[
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors",
                      active?.id === acc.id ? "bg-brand/10 border border-brand/20" : "hover:bg-foreground/5",
                    ].join(" ")}
                  >
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

        <button
          onClick={() => { setLocation("/connections"); onClose(); }}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground hover:text-foreground hover:border-border transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          {t("topbar.connectAccount")}
        </button>
      </div>
    </div>
  );
}

// ─── Profile Dropdown ─────────────────────────────────────────────────────────
function ProfileDropdown({ user, onLogout }: { user: { name?: string; email?: string }; onLogout: () => void }) {
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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 hover:bg-foreground/5 transition-colors"
      >
        <Avatar className="w-7 h-7">
          <AvatarFallback className="text-[11px] bg-brand/10 text-brand font-semibold">
            {user?.name?.charAt(0).toUpperCase() ?? "U"}
          </AvatarFallback>
        </Avatar>
        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 glass-strong rounded-xl shadow-xl border border-border/50 py-1.5 z-50 animate-blur-in">
          <div className="px-3 py-2 border-b border-border/40 mb-1">
            <p className="text-xs font-semibold truncate">{user?.name ?? "User"}</p>
            {user?.email && <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>}
          </div>
          <button
            onClick={() => { setLocation("/profile"); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-foreground/5 transition-colors"
          >
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            {t("topbar.viewProfile")}
          </button>
          <button
            onClick={() => { setLocation("/settings"); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-foreground/5 transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-muted-foreground" />
            {t("topbar.settings")}
          </button>
          <div className="border-t border-border/40 mt-1 pt-1">
            <button
              onClick={() => { onLogout(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t("topbar.signOut")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [location, setLocation] = useLocation();
  const { loading, user } = useAuth();
  const { dark, toggle: toggleDark } = useDarkMode();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>();
  const planInfoQuery = trpc.workspaces.getPlanInfo.useQuery(undefined, { enabled: !!user });
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => window.location.reload(),
  });

  const { accounts, activeAccount, setActiveAccountId: setActiveAccount } = useActiveAccount();

  const handleLangToggle = () => {
    changeLanguage(i18n.language === "ar" ? "en" : "ar");
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="app-bg flex h-screen items-center justify-center">
        <div className="glass rounded-2xl p-8 flex flex-col items-center gap-4 animate-fade-in">
          <DashfieldsIcon className="w-10 h-10 text-brand dark:text-white animate-pulse" />
          <p className="text-sm text-muted-foreground">{t("auth.loading")}</p>
        </div>
      </div>
    );
  }

  // ── Unauthenticated ──────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="app-bg flex h-screen items-center justify-center">
        <div className="glass-strong rounded-3xl p-10 flex flex-col items-center gap-6 max-w-sm w-full mx-4 animate-blur-in">
          <div className="flex flex-col items-center gap-3">
            <DashfieldsIcon className="w-16 h-16 text-brand dark:text-white" />
            <DashfieldsLogoFull className="h-8 w-auto text-brand dark:text-white" />
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground/60 tracking-widest uppercase mb-2">{t("auth.tagline")}</p>
            <p className="text-sm text-muted-foreground">{t("auth.subtitle")}</p>
          </div>
          <a
            href={getLoginUrl()}
            className="w-full py-3 px-6 rounded-xl bg-brand text-brand-foreground text-sm font-semibold text-center hover:opacity-90 transition-opacity"
          >
            {t("auth.signIn")}
          </a>
        </div>
      </div>
    );
  }

  // ── Layout ───────────────────────────────────────────────────────────────
  return (
    <div className={`app-bg flex h-screen overflow-hidden ${isRTL ? "flex-row-reverse" : ""}`}>

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex glass-strong flex-col shrink-0 transition-all duration-300 ease-out m-3 rounded-2xl overflow-hidden relative"
        style={{ width: collapsed ? 64 : 228 }}
      >
        {/* Logo */}
        <div
          className={`flex items-center px-4 h-14 border-b border-white/8 shrink-0 cursor-pointer ${collapsed ? "justify-center" : ""}`}
          onClick={() => setLocation("/")}
        >
          {collapsed ? (
            <DashfieldsIcon className="w-8 h-8 text-brand dark:text-white" />
          ) : (
            <DashfieldsLogoFull className="h-7 w-auto text-brand dark:text-white" />
          )}
        </div>

        {/* Nav Groups */}
        <nav className={`flex-1 px-2 py-2 overflow-y-auto space-y-0.5 scrollbar-none ${isRTL ? "text-right" : ""}`}>
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-1" : ""}>
              {group.labelKey && !collapsed && (
                <p className={`px-3 pt-2 pb-1 text-[9px] font-semibold tracking-widest uppercase text-muted-foreground/35 select-none ${isRTL ? "text-right" : ""}`}>
                  {t(group.labelKey)}
                </p>
              )}
              {group.labelKey && collapsed && gi > 0 && (
                <div className="mx-3 my-1.5 h-px bg-border/50" />
              )}
              {group.items.map(item => {
                const isActive = item.path === "/"
                  ? location === "/"
                  : location.startsWith(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => setLocation(item.path)}
                    title={collapsed ? t(item.labelKey) : undefined}
                    className={[
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium",
                      "transition-all duration-200 group relative",
                      isRTL ? "flex-row-reverse text-right" : "text-left",
                      isActive
                        ? "bg-brand/10 text-brand shadow-sm"
                        : "text-foreground/55 hover:text-foreground hover:bg-foreground/5",
                      collapsed ? "justify-center" : "",
                    ].join(" ")}
                  >
                    {isActive && !collapsed && (
                      <span className={`absolute ${isRTL ? "right-0" : "left-0"} top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-brand`} />
                    )}
                    <item.icon
                      className={[
                        "w-4 h-4 shrink-0 transition-all duration-200",
                        item.iconAnimation ?? "",
                        isActive ? "text-brand" : "text-foreground/40 group-hover:text-foreground/70",
                      ].join(" ")}
                    />
                    {!collapsed && <span className="truncate flex-1">{t(item.labelKey)}</span>}
                    {/* Connections badge */}
                    {item.path === "/connections" && !collapsed && accounts.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-semibold">
                        {accounts.length}
                      </span>
                    )}
                    {item.path === "/connections" && collapsed && accounts.length > 0 && (
                      <span className="absolute right-2 top-2 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── Workspace Switcher (above account) ──────────────────────────── */}
        <div className="px-2 pt-2 shrink-0">
          <button
            onClick={() => setShowWorkspaceSwitcher(true)}
            title={collapsed ? (activeWorkspace?.name ?? "Workspace") : undefined}
            className={[
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-foreground/5 transition-colors group",
              collapsed ? "justify-center" : "",
              isRTL ? "flex-row-reverse" : "",
            ].join(" ")}
          >
            <div className="w-6 h-6 rounded-lg bg-brand/10 flex items-center justify-center shrink-0 overflow-hidden">
              {activeWorkspace?.logo_url ? (
                <img src={activeWorkspace.logo_url} alt={activeWorkspace.name} className="w-full h-full object-cover" />
              ) : activeWorkspace ? (
                <span className="text-[10px] font-bold text-brand uppercase leading-none">
                  {activeWorkspace.name.charAt(0)}
                </span>
              ) : (
                <Building2 className="w-3.5 h-3.5 text-brand" />
              )}
            </div>
            {!collapsed && (
              <>
                <div className={`flex-1 min-w-0 ${isRTL ? "text-right" : ""}`}>
                  <p className="text-[11px] font-semibold truncate leading-tight">
                    {activeWorkspace?.name ?? "No Workspace"}
                  </p>
                  <div className="flex items-center gap-1">
                    {activeWorkspace?.plan && (() => {
                      const planCfg = PLAN_LIMITS[activeWorkspace.plan as WorkspacePlan];
                      return planCfg ? (
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${planCfg.badge.color}`}>
                          {planCfg.badge.label}
                        </span>
                      ) : null;
                    })()}
                    <p className="text-[10px] text-muted-foreground/55 truncate capitalize">
                      {activeWorkspace?.role ?? "Select workspace"}
                    </p>
                  </div>
                </div>
                <ChevronDown className="w-3 h-3 text-muted-foreground/50 shrink-0 group-hover:text-foreground/60 transition-colors" />
              </>
            )}
          </button>
          {/* Upgrade CTA — shown only for free plan */}
          {!collapsed && planInfoQuery.data && !planInfoQuery.data.canCreate && (
            <button
              onClick={() => { setUpgradeReason("You've reached your workspace limit."); setShowUpgradeModal(true); }}
              className="w-full mt-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[10px] font-medium text-blue-700 transition-colors"
            >
              <PlusCircle className="w-3 h-3" />
              Upgrade for more workspaces
            </button>
          )}
        </div>
        {/* ── Account Switcher (bottom) ──────────────────────────────────── */}
        <div className="px-2 pb-2 border-t border-white/8 pt-2 shrink-0">
          <button
            onClick={() => setShowAccountSwitcher(true)}
            title={collapsed ? (activeAccount?.name ?? t("topbar.switchAccount")) : undefined}
            className={[
              "w-full flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-foreground/5 transition-colors group",
              collapsed ? "justify-center" : "",
              isRTL ? "flex-row-reverse" : "",
            ].join(" ")}
          >
            {activeAccount ? (
              <>
                <div className="relative shrink-0">
                  <Avatar className="w-7 h-7">
                    {activeAccount.profile_picture && <AvatarImage src={activeAccount.profile_picture} />}
                    <AvatarFallback className="text-[10px] bg-brand/10 text-brand font-semibold">
                      {(activeAccount.name ?? activeAccount.platform).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-background flex items-center justify-center">
                    <PlatformIcon platform={activeAccount.platform} className="w-2.5 h-2.5" />
                  </div>
                </div>
                {!collapsed && (
                  <>
                    <div className={`flex-1 min-w-0 ${isRTL ? "text-right" : ""}`}>
                      <p className="text-[11px] font-semibold truncate leading-tight">
                        {activeAccount.name ?? activeAccount.username ?? activeAccount.platform}
                      </p>
                      <p className="text-[10px] text-muted-foreground/55 truncate">
                        {activeAccount.platform.charAt(0).toUpperCase() + activeAccount.platform.slice(1)}
                        {accounts.length > 1 && ` · ${accounts.length}`}
                      </p>
                    </div>
                    <ChevronDown className="w-3 h-3 text-muted-foreground/50 shrink-0 group-hover:text-foreground/60 transition-colors" />
                  </>
                )}
              </>
            ) : (
              <>
                <div className="w-7 h-7 rounded-full border-2 border-dashed border-border/50 flex items-center justify-center shrink-0">
                  <PlusCircle className="w-3.5 h-3.5 text-muted-foreground/50" />
                </div>
                {!collapsed && (
                  <span className="text-[11px] text-muted-foreground/60 truncate">{t("topbar.connectAccount")}</span>
                )}
              </>
            )}
          </button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className={`absolute ${isRTL ? "-left-3" : "-right-3"} top-[72px] w-6 h-6 rounded-full glass-strong flex items-center justify-center hover:bg-brand/10 transition-colors z-10 shadow-sm border border-border/50`}
        >
          {(isRTL ? !collapsed : collapsed)
            ? <ChevronRight className="w-3 h-3 text-foreground/60" />
            : <ChevronLeft className="w-3 h-3 text-foreground/60" />
          }
        </button>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden min-w-0 flex flex-col">
        {/* Top bar */}
        <div className={`flex items-center justify-between px-6 py-2.5 border-b border-border/40 shrink-0 ${isRTL ? "flex-row-reverse" : ""}`}>
          {/* Left: search + connection status */}
          <div className="flex items-center gap-3">
            <GlobalSearch />
            {accounts.length > 0 ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                {t("topbar.platformsConnected", { count: accounts.length })}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/45">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/25 inline-block" />
                {t("topbar.noPlatforms")}
              </div>
            )}
          </div>

          {/* Right: actions + profile */}
          <div className={`flex items-center gap-1 ${isRTL ? "flex-row-reverse" : ""}`}>
            {/* Language toggle */}
            <button
              onClick={handleLangToggle}
              title={i18n.language === "ar" ? "Switch to English" : "التحويل للعربية"}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors font-medium text-xs"
            >
              <span className="text-[11px] font-semibold">
                {i18n.language === "ar" ? "EN" : "ع"}
              </span>
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              title={dark ? t("topbar.switchLight") : t("topbar.switchDark")}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
            >
              {dark ? <Sun className="w-4 h-4 icon-spin" /> : <Moon className="w-4 h-4 icon-bounce" />}
            </button>

            {/* Notifications */}
            <NotificationBell />

            {/* Profile Dropdown */}
            <ProfileDropdown
              user={{ name: user?.name ?? undefined, email: user?.email ?? undefined }}
              onLogout={() => logoutMutation.mutate()}
            />
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto animate-fade-in pb-16 md:pb-0">
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Nav ──────────────────────────────────────────────── */}
      <MobileBottomNav />

      {/* ── Workspace Switcher Modal ──────────────────────────────────────── */}
      {showWorkspaceSwitcher && (
        <WorkspaceSwitcherModal
          workspaces={workspaces}
          active={activeWorkspace}
          onSelect={(id) => { setActiveWorkspace(id); setShowWorkspaceSwitcher(false); }}
          onClose={() => setShowWorkspaceSwitcher(false)}
        />
      )}
            {/* ── Account Switcher Modal ───────────────────────────────────── */}
      {showAccountSwitcher && (
        <AccountSwitcherModal
          accounts={accounts}
          active={activeAccount}
          onSelect={setActiveAccount}
          onClose={() => setShowAccountSwitcher(false)}
        />
      )}
      {/* ── Upgrade Modal ────────────────────────────────────────────────────────────── */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={(activeWorkspace?.plan as WorkspacePlan) ?? "free"}
        reason={upgradeReason}
      />
    </div>
  );
}
