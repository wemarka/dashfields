/**
 * DashboardLayout.tsx — Main app shell with accordion sidebar.
 * Sub-components live in ./layout-parts/ for maintainability.
 */
import { useAuth } from "@/shared/hooks/useAuth";

import { GlobalSettingsModal, type SettingsTabId } from "@/app/components/GlobalSettingsModal";
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
  // ChevronLeft kept for sidebar collapse button
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/core/components/ui/tooltip";
import { navSections } from "@/config/navigation";
import { useState, useEffect, useRef } from "react";
import { useActiveAccount } from "@/core/contexts/ActiveAccountContext";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { useLocation } from "wouter";

import {
  useDarkMode, PLATFORM_ICONS,
  WorkspaceSwitcherModal, AccountSwitcherModal,
} from "./layout-parts";

function PlatformIcon({ platform, className = "w-3.5 h-3.5" }: { platform: string; className?: string }) {
  const Icon = PLATFORM_ICONS[platform] ?? Globe2;
  return <Icon className={className} />;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [logoAreaHovered, setLogoAreaHovered] = useState(false);

  const handleCollapse = (val: boolean) => {
    setIsAnimating(true);
    setCollapsed(val);
    setTimeout(() => setIsAnimating(false), 300);
  };
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

  // Auth redirect: read window.location directly so this effect only fires when
  // auth state changes, NOT on every navigation (avoids re-render on route change).
  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) return;
    const currentPath = window.location.pathname + window.location.search;
    const returnTo = encodeURIComponent(currentPath);
    setLocation(`/login?returnTo=${returnTo}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAuthenticated]);

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

  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTabId>("account");
  const openSettings = (tab: SettingsTabId = "account") => { setSettingsInitialTab(tab); setShowGlobalSettings(true); };

  useKeyboardShortcuts({
    onNewPost: () => setLocation("/calendar"),
    onOpenSearch: () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
    },
    onShowShortcuts: () => setShowShortcuts(s => !s),
  });
  const planInfoQuery = trpc.workspaces.getPlanInfo.useQuery(undefined, { enabled: !!user });
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();

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
        className="hidden md:flex flex-col shrink-0 overflow-hidden relative border-r border-border/30"
        style={{
          width: collapsed ? 60 : 220,
          transition: 'width 280ms cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'var(--sidebar-bg, hsl(var(--background)))',
          boxShadow: 'none'
        }}
      >
        {/* Logo + Collapse Button */}
        <div className="flex items-center h-14 border-b border-border/30 shrink-0 px-3 justify-between">

          {/* ── EXPANDED STATE: full logo + collapse button ── */}
          {!collapsed && (
            <>
              <div
                onClick={() => setLocation("/dashboard")}
                className="cursor-pointer select-none flex items-center min-w-0 flex-1 overflow-hidden"
              >
                <img
                  src={dark
                    ? "https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/dashfields-logo-full-white-cropped_9f9de9c4.png"
                    : "https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/dashfields-logo-full-cropped_e5f165fe.png"
                  }
                  alt="Dashfields"
                  className="h-8 w-auto shrink-0 object-contain"
                  style={{
                    opacity: isAnimating ? 0 : 1,
                    transition: 'opacity 180ms ease',
                  }}
                />
              </div>
              {/* Collapse button — visible when expanded */}
              <button
                onClick={() => handleCollapse(true)}
                title="Close sidebar"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-foreground/8 transition-all duration-200 shrink-0 ml-1"
              >
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <line x1="6" y1="1" x2="6" y2="17" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </button>
            </>
          )}

          {/* ── COLLAPSED STATE: icon only, hover reveals expand button ── */}
          {collapsed && (
            <div
              className="relative flex items-center justify-center w-full"
              onMouseEnter={() => setLogoAreaHovered(true)}
              onMouseLeave={() => setLogoAreaHovered(false)}
            >
              {/* App icon — fades out on hover */}
              <img
                src={dark
                  ? "https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/dashfields-icon-white_0f5f68db.png"
                  : "https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/dashfields-icon_53514cde.png"
                }
                alt="Dashfields"
                onClick={() => setLocation("/dashboard")}
                className="w-8 h-8 object-contain cursor-pointer"
                style={{
                  opacity: logoAreaHovered ? 0 : 1,
                  transform: logoAreaHovered ? 'scale(0.85)' : 'scale(1)',
                  transition: 'opacity 180ms ease, transform 180ms ease',
                }}
              />
              {/* Expand button — appears on hover */}
              <button
                onClick={() => handleCollapse(false)}
                title="Open sidebar"
                className="absolute inset-0 flex items-center justify-center rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-foreground/8 transition-all duration-200"
                style={{
                  opacity: logoAreaHovered ? 1 : 0,
                  transform: logoAreaHovered ? 'scale(1)' : 'scale(0.85)',
                  transition: 'opacity 180ms ease, transform 180ms ease',
                  pointerEvents: logoAreaHovered ? 'auto' : 'none',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"
                  style={{ transform: isRTL ? 'scaleX(-1)' : 'scaleX(1)' }}
                >
                  <rect x="1" y="1" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <line x1="6" y1="1" x2="6" y2="17" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </button>
            </div>
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
              const btn = (
                <button key={item.path} onClick={() => setLocation(item.path)}
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
                  {!collapsed && (
                    <span
                      className="truncate flex-1"
                      style={{ opacity: isAnimating ? 0 : 1, transition: 'opacity 150ms ease' }}
                    >{t(item.labelKey)}</span>
                  )}
                </button>
              );
              return collapsed ? (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side={isRTL ? "left" : "right"} sideOffset={8}>{t(item.labelKey)}</TooltipContent>
                </Tooltip>
              ) : btn;
            }

            const sectionBtn = (
                <button onClick={() => collapsed ? setLocation(item.subItems![0].path) : toggleSection(item.path)}
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
                      <span
                        className="truncate flex-1"
                        style={{ opacity: isAnimating ? 0 : 1, transition: 'opacity 150ms ease' }}
                      >{t(item.labelKey)}</span>
                      <ChevronDown
                        className={["w-3.5 h-3.5 text-foreground/30 transition-transform duration-200 shrink-0", isOpen ? "rotate-180" : ""].join(" ")}
                        style={{ opacity: isAnimating ? 0 : 1, transition: 'opacity 150ms ease' }}
                      />
                    </>
                  )}
                </button>
              );
            return (
              <div key={item.path}>
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{sectionBtn}</TooltipTrigger>
                    <TooltipContent side={isRTL ? "left" : "right"} sideOffset={8}>{t(item.labelKey)}</TooltipContent>
                  </Tooltip>
                ) : sectionBtn}
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

        {/* Bottom icon row: Settings + Help + Install */}
        <div className="px-3 pb-3 shrink-0">
          <div className="h-px bg-border/30 mb-2" />
          <div className={`flex items-center gap-1 ${isRTL ? "flex-row-reverse" : ""}`}>
            {/* Settings */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => openSettings("account")}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground/40 hover:text-foreground/70 hover:bg-foreground/5 transition-colors group">
                  <svg className="w-[16px] h-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent side={isRTL ? "left" : "right"} sideOffset={8}>Settings</TooltipContent>
            </Tooltip>
            {/* Help */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => window.open("https://help.manus.im", "_blank")}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground/40 hover:text-foreground/70 hover:bg-foreground/5 transition-colors">
                  <svg className="w-[16px] h-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent side={isRTL ? "left" : "right"} sideOffset={8}>Help & Support</TooltipContent>
            </Tooltip>
            {/* Tools */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => window.open("/tools", "_blank")}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground/40 hover:text-foreground/70 hover:bg-foreground/5 transition-colors">
                  <svg className="w-[16px] h-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent side={isRTL ? "left" : "right"} sideOffset={8}>Tools</TooltipContent>
            </Tooltip>
            {/* Install App */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    if ('serviceWorker' in navigator) {
                      window.dispatchEvent(new Event('beforeinstallprompt'));
                    }
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground/40 hover:text-foreground/70 hover:bg-foreground/5 transition-colors">
                  <svg className="w-[16px] h-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent side={isRTL ? "left" : "right"} sideOffset={8}>Install App</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Collapse Toggle moved to logo hover area */}
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
            <NotificationBell />
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

      <GlobalSettingsModal open={showGlobalSettings} onOpenChange={setShowGlobalSettings} initialTab={settingsInitialTab} />
    </div>
  );
}
