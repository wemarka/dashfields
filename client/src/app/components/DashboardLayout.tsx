/**
 * DashboardLayout.tsx — Main app shell with accordion sidebar.
 * Sub-components live in ./layout-parts/ for maintainability.
 */
import { useAuth } from "@/shared/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { MobileBottomNav } from "@/app/components/MobileBottomNav";
import { trpc } from "@/core/lib/trpc";
import { NotificationBell } from "@/app/components/NotificationBell";
import { GlobalSearch } from "@/app/components/GlobalSearch";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "@/core/i18n";
import { UpgradeModal } from "@/app/features/billing/UpgradeModal";
import type { WorkspacePlan } from "@shared/planLimits";
import { useKeyboardShortcuts } from "@/shared/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsModal } from "@/app/components/KeyboardShortcutsModal";
import {
  ChevronLeft, ChevronRight,
  Sun, Moon, ChevronDown, PlusCircle, Globe2,
} from "lucide-react";
import { navSections } from "@/config/navigation";
import { useState, useEffect, useRef } from "react";
import { useActiveAccount } from "@/core/contexts/ActiveAccountContext";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { useLocation } from "wouter";

import {
  useDarkMode, PLATFORM_ICONS,
  WorkspaceSwitcherModal, AccountSwitcherModal, ProfileDropdown,
} from "./layout-parts";

function PlatformIcon({ platform, className = "w-3.5 h-3.5" }: { platform: string; className?: string }) {
  const Icon = PLATFORM_ICONS[platform] ?? Globe2;
  return <Icon className={className} />;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navSections.forEach(s => s.items.forEach(item => {
      if (item.subItems && window.location.pathname.startsWith(item.path)) {
        initial[item.path] = true;
      }
    }));
    return initial;
  });
  const toggleSection = (path: string) => setOpenSections(prev => ({ ...prev, [path]: !prev[path] }));
  const [location, setLocation] = useLocation();
  const { loading, user, isAuthenticated, signOut } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) return;
    const returnTo = encodeURIComponent(location + window.location.search);
    setLocation(`/login?returnTo=${returnTo}`);
  }, [loading, isAuthenticated, location, setLocation]);

  const { dark, toggle: toggleDark } = useDarkMode();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  // Current page label from nav
  const settingsSubItems = [
    { labelKey: "nav.integrations", path: "/settings/integrations" },
    { labelKey: "nav.workspace",    path: "/settings/workspace" },
    { labelKey: "nav.billing",      path: "/settings/billing" },
  ];
  const allNavItems = [
    ...navSections.flatMap(s => s.items).flatMap(item => item.subItems ?? [item]),
    ...settingsSubItems,
  ];
  const currentNavItem = allNavItems.find(item => {
    if (item.path === "/dashboard") return location === "/dashboard" || location === "/";
    return location.startsWith(item.path);
  });

  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>();
  const [showShortcuts, setShowShortcuts] = useState(false);

  useKeyboardShortcuts({
    onNewPost: () => setLocation("/calendar"),
    onOpenSearch: () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
    },
    onShowShortcuts: () => setShowShortcuts(s => !s),
  });
  const planInfoQuery = trpc.workspaces.getPlanInfo.useQuery(undefined, { enabled: !!user });
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();

  const handleLogout = async () => { await signOut(); };

  const { accounts, activeAccount, setActiveAccountId: setActiveAccount } = useActiveAccount();

  // Auto-refresh ad account profile pictures
  const utils = trpc.useUtils();
  const refreshPictures = trpc.meta.refreshAccountPictures.useMutation({
    onSuccess: (res) => { if (res.updated > 0) utils.social.list.invalidate(); },
  });
  const picturesRefreshedRef = useRef(false);
  useEffect(() => {
    if (picturesRefreshedRef.current) return;
    if (!accounts || accounts.length === 0) return;
    const needsRefresh = accounts.some(
      a => a.platform === "facebook" && a.profile_picture?.includes("profilepic/?asid=")
    );
    if (needsRefresh) {
      picturesRefreshedRef.current = true;
      refreshPictures.mutate({});
    }
  }, [accounts]);

  const handleLangToggle = () => { changeLanguage(i18n.language === "ar" ? "en" : "ar"); };

  if (loading) {
    return (
      <div className="app-bg flex h-screen items-center justify-center">
        <div className="glass rounded-2xl p-8 flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-10 h-10 rounded-xl bg-brand/10 animate-pulse" />
          <p className="text-sm text-muted-foreground">{t("auth.loading")}</p>
        </div>
      </div>
    );
  }

  if (!loading && !isAuthenticated) return null;

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
          onClick={() => setLocation("/dashboard")}
        >
          {collapsed ? (
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/dashfields-icon_3bd5ad8c.svg" alt="Dashfields" className="w-8 h-8" />
          ) : (
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/dashfields-logo-full_61e255da.svg" alt="Dashfields" className="h-7 w-auto" />
          )}
        </div>

        {/* Nav Groups — Accordion Pattern */}
        <nav className={`flex-1 px-2 py-3 overflow-y-auto space-y-0.5 scrollbar-none ${isRTL ? "text-right" : ""}`}>
          {navSections.flatMap(s => s.items).map(item => {
            const hasChildren = !!(item.subItems && item.subItems.length > 0);
            const isSectionActive = location.startsWith(item.path);
            const isOpen = openSections[item.path] ?? false;

            if (!hasChildren) {
              const isActive = item.path === "/dashboard"
                ? location === "/dashboard" || location === "/"
                : location.startsWith(item.path);
              return (
                <button key={item.path} onClick={() => setLocation(item.path)}
                  title={collapsed ? t(item.labelKey) : undefined}
                  className={[
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium",
                    "transition-all duration-200 group relative",
                    isRTL ? "flex-row-reverse text-right" : "text-left",
                    isActive ? "bg-brand/10 text-brand shadow-sm" : "text-foreground/55 hover:text-foreground hover:bg-foreground/5",
                    collapsed ? "justify-center" : "",
                  ].join(" ")}>
                  {isActive && !collapsed && (
                    <span className={`absolute ${isRTL ? "right-0" : "left-0"} top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-brand`} />
                  )}
                  <item.icon className={["w-[18px] h-[18px] shrink-0 transition-all duration-200", isActive ? "text-brand" : "text-foreground/40 group-hover:text-foreground/70"].join(" ")} />
                  {!collapsed && <span className="truncate flex-1">{t(item.labelKey)}</span>}
                </button>
              );
            }

            return (
              <div key={item.path}>
                <button onClick={() => collapsed ? setLocation(item.subItems![0].path) : toggleSection(item.path)}
                  title={collapsed ? t(item.labelKey) : undefined}
                  className={[
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium",
                    "transition-all duration-200 group relative",
                    isRTL ? "flex-row-reverse text-right" : "text-left",
                    isSectionActive ? "text-foreground" : "text-foreground/55 hover:text-foreground hover:bg-foreground/5",
                    collapsed ? "justify-center" : "",
                  ].join(" ")}>
                  <item.icon className={["w-[18px] h-[18px] shrink-0 transition-all duration-200", isSectionActive ? "text-brand" : "text-foreground/40 group-hover:text-foreground/70"].join(" ")} />
                  {!collapsed && (
                    <>
                      <span className="truncate flex-1">{t(item.labelKey)}</span>
                      <ChevronDown className={["w-3.5 h-3.5 text-foreground/30 transition-transform duration-200 shrink-0", isOpen ? "rotate-180" : ""].join(" ")} />
                    </>
                  )}
                </button>
                {!collapsed && (
                  <div className="overflow-hidden transition-all duration-200 ease-out"
                    style={{ maxHeight: isOpen ? `${(item.subItems?.length ?? 0) * 44}px` : "0px" }}>
                    <div className="ml-3 pl-3 border-l border-border/40 space-y-0.5 py-0.5">
                      {item.subItems!.map(sub => {
                        const isSubActive = location.startsWith(sub.path);
                        return (
                          <button key={sub.path} onClick={() => setLocation(sub.path)}
                            className={[
                              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] font-medium",
                              "transition-all duration-150",
                              isRTL ? "flex-row-reverse text-right" : "text-left",
                              isSubActive ? "bg-brand/10 text-brand" : "text-foreground/50 hover:text-foreground hover:bg-foreground/5",
                            ].join(" ")}>
                            <sub.icon className={["w-3.5 h-3.5 shrink-0", isSubActive ? "text-brand" : "text-foreground/35"].join(" ")} />
                            <span className="truncate">{t(sub.labelKey)}</span>
                            {isSubActive && <span className="ml-auto w-1 h-1 rounded-full bg-brand shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Integrations pinned at bottom */}
        <div className="px-2 pb-3 shrink-0">
          <div className="h-px bg-border/30 mx-1 mb-2" />
          {(() => {
            const isActive = location.startsWith("/settings/integrations");
            return (
              <button onClick={() => setLocation("/settings/integrations")}
                title={collapsed ? t("nav.integrations") : undefined}
                className={[
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium",
                  "transition-all duration-200 group relative",
                  isRTL ? "flex-row-reverse text-right" : "text-left",
                  isActive ? "bg-brand/10 text-brand shadow-sm" : "text-foreground/55 hover:text-foreground hover:bg-foreground/5",
                  collapsed ? "justify-center" : "",
                ].join(" ")}>
                {isActive && !collapsed && (
                  <span className={`absolute ${isRTL ? "right-0" : "left-0"} top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-brand`} />
                )}
                <svg className={["w-[18px] h-[18px] shrink-0 transition-all duration-200", isActive ? "text-brand" : "text-foreground/40 group-hover:text-foreground/70"].join(" ")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                {!collapsed && <span className="truncate flex-1">{t("nav.integrations")}</span>}
              </button>
            );
          })()}
        </div>

        {/* Collapse Toggle */}
        <button onClick={() => setCollapsed(c => !c)} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={["mx-2 mb-2 flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium",
            "transition-all duration-200 text-foreground/40 hover:text-foreground/70 hover:bg-foreground/5",
            collapsed ? "justify-center" : "",
          ].join(" ")}>
          {(isRTL ? !collapsed : collapsed) ? <ChevronRight className="w-3.5 h-3.5 shrink-0" /> : <ChevronLeft className="w-3.5 h-3.5 shrink-0" />}
          {!collapsed && <span className="truncate">Collapse</span>}
        </button>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden min-w-0 flex flex-col">
        <div className={`flex items-center justify-between px-6 py-2.5 border-b border-border/40 shrink-0 ${isRTL ? "flex-row-reverse" : ""}`}>
          {/* Left: search + Account Switcher Pill */}
          <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <GlobalSearch />
            <button onClick={() => setShowAccountSwitcher(true)}
              className={["flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-border/50 bg-background/60 hover:border-brand/40 hover:bg-foreground/5 transition-all duration-200 group max-w-[200px] shrink-0 shadow-sm",
                isRTL ? "flex-row-reverse" : "",
              ].join(" ")}>
              {activeAccount ? (
                <>
                  <div className="relative shrink-0">
                    <Avatar className="w-6 h-6">
                      {activeAccount.profile_picture && <AvatarImage src={activeAccount.profile_picture} />}
                      <AvatarFallback className="text-[9px] bg-brand/10 text-brand font-bold">
                        {(activeAccount.name ?? activeAccount.platform).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-background border border-border/40 flex items-center justify-center">
                      <PlatformIcon platform={activeAccount.platform} className="w-2 h-2" />
                    </div>
                  </div>
                  <div className={`flex-1 min-w-0 ${isRTL ? "text-right" : ""}`}>
                    <p className="text-[11px] font-semibold truncate leading-tight text-foreground">
                      {activeAccount.name ?? activeAccount.username ?? activeAccount.platform}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 truncate leading-tight flex items-center gap-1">
                      <span>{activeAccount.platform.charAt(0).toUpperCase() + activeAccount.platform.slice(1)}</span>
                      {accounts.length > 1 && (
                        <span className="px-1 py-0 rounded-full bg-brand/10 text-brand text-[9px] font-semibold">{accounts.length}</span>
                      )}
                    </p>
                  </div>
                  <ChevronDown className="w-3 h-3 text-muted-foreground/40 shrink-0 group-hover:text-brand/60 transition-colors" />
                </>
              ) : (
                <>
                  <div className="w-6 h-6 rounded-full border-2 border-dashed border-border/50 flex items-center justify-center shrink-0">
                    <PlusCircle className="w-3 h-3 text-muted-foreground/50" />
                  </div>
                  <span className="text-[11px] text-muted-foreground/60 truncate">{t("topbar.connectAccount")}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                </>
              )}
            </button>
          </div>
          {/* Center: Page Title Breadcrumb */}
          {currentNavItem && (
            <div className="hidden md:flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground/40 text-xs">Dashfields</span>
              <span className="text-muted-foreground/40 text-xs">/</span>
              <span className="text-foreground/80 font-medium text-xs">{t(currentNavItem.labelKey)}</span>
            </div>
          )}
          {/* Right: controls */}
          <div className={`flex items-center gap-1 ${isRTL ? "flex-row-reverse" : ""}`}>
            <button onClick={handleLangToggle}
              title={i18n.language === "ar" ? "Switch to English" : "التحويل للعربية"}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors font-medium text-xs">
              <span className="text-[11px] font-semibold">{i18n.language === "ar" ? "EN" : "ع"}</span>
            </button>
            <button onClick={toggleDark} title={dark ? t("topbar.switchLight") : t("topbar.switchDark")}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors">
              {dark ? <Sun className="w-4 h-4 icon-spin" /> : <Moon className="w-4 h-4 icon-bounce" />}
            </button>
            <NotificationBell />
            <ProfileDropdown
              user={{ name: user?.name ?? undefined, email: user?.email ?? undefined }}
              onLogout={handleLogout}
              workspaces={workspaces}
              activeWorkspace={activeWorkspace}
              onSelectWorkspace={(id) => setActiveWorkspace(id)}
              onNewWorkspace={() => setShowWorkspaceSwitcher(true)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto animate-fade-in pb-16 md:pb-0">{children}</div>
      </main>

      <MobileBottomNav />

      {showWorkspaceSwitcher && (
        <WorkspaceSwitcherModal workspaces={workspaces} active={activeWorkspace}
          onSelect={(id) => { setActiveWorkspace(id); setShowWorkspaceSwitcher(false); }}
          onClose={() => setShowWorkspaceSwitcher(false)} />
      )}
      {showAccountSwitcher && (
        <AccountSwitcherModal accounts={accounts} active={activeAccount}
          onSelect={setActiveAccount} onClose={() => setShowAccountSwitcher(false)} />
      )}
      <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)}
        currentPlan={(activeWorkspace?.plan as WorkspacePlan) ?? "free"} reason={upgradeReason} />
      <KeyboardShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
