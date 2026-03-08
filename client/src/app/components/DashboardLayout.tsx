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
  const [logoAreaHovered, setLogoAreaHovered] = useState(false);
  const [collapsedPopover, setCollapsedPopover] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const collapsedPopoverRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  // Close collapsed popover when clicking outside
  useEffect(() => {
    if (!collapsedPopover) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // Don't close if clicking inside the popover
      if (collapsedPopoverRef.current && collapsedPopoverRef.current.contains(target)) return;
      // Don't close if clicking inside the sidebar (the trigger button)
      if (sidebarRef.current && sidebarRef.current.contains(target)) return;
      setCollapsedPopover(null);
      setPopoverPos(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [collapsedPopover]);

  const handleCollapse = (val: boolean) => {
    setCollapsed(val);
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
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>();
  const [showShortcuts, setShowShortcuts] = useState(false);

  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTabId>("account");
  const openSettings = (tab: SettingsTabId = "account") => { setSettingsInitialTab(tab); setShowGlobalSettings(true); };

  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Close account dropdown on outside click
  useEffect(() => {
    if (!showAccountDropdown) return;
    const handler = (e: MouseEvent) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setShowAccountDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAccountDropdown]);

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
        ref={sidebarRef}
        className="hidden md:flex flex-col shrink-0 overflow-hidden relative"
        style={{
          width: collapsed ? 60 : 220,
          transition: 'width 280ms cubic-bezier(0.4, 0, 0.2, 1)',
          background: '#f7f7f8',
          borderRight: '1px solid #ebebeb'
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
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium",
                    "transition-all duration-150 group relative",
                    isRTL ? "flex-row-reverse text-right" : "text-left",
                    isActive ? "text-brand" : "text-foreground/55 hover:text-foreground hover:bg-foreground/5",
                    collapsed ? "justify-center" : "",
                  ].join(" ")}>
                  {isActive && !collapsed && (
                    <span className={`absolute ${isRTL ? "right-0" : "left-0"} top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-brand`} />
                  )}
                  <item.icon className={["w-[18px] h-[18px] shrink-0 transition-all duration-150", isActive ? "text-brand" : "text-foreground/40 group-hover:text-foreground/70"].join(" ")} />
                  {!collapsed && (
                    <span
                      className="truncate flex-1"
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
                <button onClick={(e) => {
                  if (collapsed) {
                    if (collapsedPopover === item.path) {
                      setCollapsedPopover(null);
                      setPopoverPos(null);
                    } else {
                      const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                      setPopoverPos({ top: rect.top, left: rect.right + 8 });
                      setCollapsedPopover(item.path);
                    }
                  } else {
                    toggleSection(item.path);
                  }
                }}
                  className={[
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium",
                    "transition-all duration-150 group relative",
                    isRTL ? "flex-row-reverse text-right" : "text-left",
                    isSectionActive ? "text-foreground" : "text-foreground/55 hover:text-foreground hover:bg-foreground/5",
                    collapsed ? "justify-center" : "",
                  ].join(" ")}>
                  <item.icon className={["w-[18px] h-[18px] shrink-0 transition-all duration-150", isSectionActive ? "text-brand" : "text-foreground/40 group-hover:text-foreground/70"].join(" ")} />
                  {!collapsed && (
                    <>
                      <span
                        className="truncate flex-1"
                      >{t(item.labelKey)}</span>
                      <ChevronDown
                        className={["w-3.5 h-3.5 text-foreground/30 shrink-0", isOpen ? "rotate-180" : ""].join(" ")}
                      />
                    </>
                  )}
                </button>
              );
            return (
              <div key={item.path} className="relative">
                {collapsed ? (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>{sectionBtn}</TooltipTrigger>
                      <TooltipContent side={isRTL ? "left" : "right"} sideOffset={8}>{t(item.labelKey)}</TooltipContent>
                    </Tooltip>
                    {/* Collapsed submenu popover — rendered via portal-like fixed positioning */}
                    {collapsedPopover === item.path && popoverPos && (
                      <div
                        ref={collapsedPopoverRef}
                        className="fixed z-[9999] py-1.5 rounded-xl overflow-hidden"
                        style={{
                          top: popoverPos.top,
                          left: isRTL ? 'auto' : popoverPos.left,
                          right: isRTL ? `calc(100vw - ${popoverPos.left - 16}px)` : 'auto',
                          background: '#ffffff',
                          border: '1px solid #ebebeb',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
                          minWidth: 190,
                        }}
                      >
                        <div className="px-3 py-1.5 mb-0.5">
                          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{t(item.labelKey)}</span>
                        </div>
                        {item.subItems!.map(sub => {
                          const isSubActive = location.startsWith(sub.path);
                          return (
                            <button
                              key={sub.path}
                              onClick={() => { setLocation(sub.path); setCollapsedPopover(null); }}
                              className={[
                                "w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-all duration-150",
                                isRTL ? "flex-row-reverse text-right" : "text-left",
                                isSubActive ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                              ].join(" ")}
                            >
                              <sub.icon className={["w-3.5 h-3.5 shrink-0", isSubActive ? "text-blue-500" : "text-gray-400"].join(" ")} />
                              <span className="truncate">{t(sub.labelKey)}</span>
                              {isSubActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
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
                              isSubActive ? "text-brand font-semibold" : "text-foreground/50 hover:text-foreground hover:bg-foreground/5",
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

        {/* Bottom icon row: Tools + Install + Settings + Help + Sign Out */}
        <div className="px-3 pb-3 shrink-0">
          <div className="h-px bg-border/30 mb-2" />
          <div className={`flex gap-1 ${collapsed ? "flex-col items-center" : (isRTL ? "flex-row-reverse items-center" : "flex-row items-center")}`}>
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
            {/* Vertical separator (expanded) / Horizontal separator (collapsed) */}
            {!collapsed && <div className="w-px h-5 bg-border/40 mx-0.5 shrink-0" />}
            {collapsed && <div className="h-px w-5 bg-border/40 my-0.5 shrink-0" />}
            {/* Sign Out */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowSignOutConfirm(true)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400/60 hover:text-red-500 hover:bg-red-500/8 transition-colors"
                >
                  <svg className="w-[16px] h-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent side={isRTL ? "left" : "right"} sideOffset={8}>Sign Out</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Collapse Toggle moved to logo hover area */}
      </aside>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden min-w-0 flex flex-col">
        <div className={`flex items-center justify-between px-6 py-2.5 border-b border-border/40 shrink-0 ${isRTL ? "flex-row-reverse" : ""}`}>
          {/* Left: search */}
          <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <GlobalSearch />
          </div>

          {/* Right: NotificationBell + Account Avatar Dropdown */}
          <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
            <NotificationBell />
            {/* Account Avatar Dropdown */}
            <div className="relative" ref={accountDropdownRef}>
              <button
                onClick={() => setShowAccountDropdown(v => !v)}
                className="flex items-center gap-1.5 rounded-xl hover:bg-foreground/5 transition-colors p-1 group"
              >
                {activeAccount ? (
                  <div className="relative">
                    <Avatar className="w-8 h-8">
                      {activeAccount.profile_picture && <AvatarImage src={activeAccount.profile_picture} />}
                      <AvatarFallback className="text-[11px] bg-brand/10 text-brand font-bold">
                        {(activeAccount.name ?? activeAccount.platform).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-background border border-border/40 flex items-center justify-center">
                      <PlatformIcon platform={activeAccount.platform} className="w-2 h-2" />
                    </div>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full border-2 border-dashed border-border/50 flex items-center justify-center">
                    <PlusCircle className="w-4 h-4 text-muted-foreground/50" />
                  </div>
                )}
                <ChevronDown className={`w-3 h-3 text-muted-foreground/40 group-hover:text-foreground/60 transition-all ${showAccountDropdown ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown Panel */}
              {showAccountDropdown && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-background border border-border/50 rounded-2xl shadow-xl z-50 overflow-hidden">
                  {/* Active account header */}
                  {activeAccount && (
                    <div className="px-4 py-3 border-b border-border/30 bg-foreground/[0.02]">
                      <div className="flex items-center gap-2.5">
                        <div className="relative shrink-0">
                          <Avatar className="w-9 h-9">
                            {activeAccount.profile_picture && <AvatarImage src={activeAccount.profile_picture} />}
                            <AvatarFallback className="text-[12px] bg-brand/10 text-brand font-bold">
                              {(activeAccount.name ?? activeAccount.platform).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-background border border-border/40 flex items-center justify-center">
                            <PlatformIcon platform={activeAccount.platform} className="w-2.5 h-2.5" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold truncate text-foreground">
                            {activeAccount.name ?? activeAccount.username ?? activeAccount.platform}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 truncate capitalize">
                            {activeAccount.platform}{activeAccount.account_type ? ` · ${activeAccount.account_type}` : ""}
                          </p>
                        </div>
                        {accounts.length > 1 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-brand/10 text-brand text-[10px] font-semibold shrink-0">{accounts.length}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Accounts list grouped by platform */}
                  {accounts.length > 0 && (
                    <div className="py-1.5 max-h-60 overflow-y-auto">
                      {(() => {
                        type AccType = typeof accounts[0];

                        // ── Smart grouping helpers ──
                        /** Normalize a name for fuzzy comparison: lowercase, remove punctuation & extra spaces */
                        const normalizeName = (s: string) =>
                          s.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff\s]/g, "").replace(/\s+/g, " ").trim();

                        /** Check if two names are similar (exact or one contains the other) */
                        const namesSimilar = (a: string, b: string) => {
                          const na = normalizeName(a), nb = normalizeName(b);
                          if (!na || !nb) return false;
                          return na === nb || na.includes(nb) || nb.includes(na);
                        };

                        // Separate Meta (FB + IG) from other platforms
                        const metaAccounts = accounts.filter(a => a.platform === "facebook" || a.platform === "instagram");
                        const otherAccounts = accounts.filter(a => a.platform !== "facebook" && a.platform !== "instagram");

                        // ── Build named groups from Meta accounts ──
                        // Each group has a canonical name + list of accounts
                        type NamedGroup = { groupName: string; accounts: AccType[] };
                        const groups: NamedGroup[] = [];
                        const assignedIds = new Set<number>();

                        for (const acc of metaAccounts) {
                          if (assignedIds.has(acc.id)) continue;
                          const accName = acc.name ?? acc.username ?? "";
                          // Find all other Meta accounts with similar names
                          const siblings = metaAccounts.filter(other =>
                            !assignedIds.has(other.id) &&
                            other.id !== acc.id &&
                            namesSimilar(accName, other.name ?? other.username ?? "")
                          );
                          const groupMembers = [acc, ...siblings];
                          groupMembers.forEach(m => assignedIds.add(m.id));
                          // Use the shortest non-empty name as the group label
                          const groupName = groupMembers
                            .map(m => m.name ?? m.username ?? "")
                            .filter(Boolean)
                            .sort((a, b) => a.length - b.length)[0] ?? accName;
                          groups.push({ groupName, accounts: groupMembers });
                        }

                        // Meta infinity SVG
                        const MetaLogo = () => (
                          <svg viewBox="0 0 24 12" className="w-4 h-2" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 6C6 4.343 7.343 3 9 3C10.657 3 11.657 4.5 12 6C12.343 7.5 13.343 9 15 9C16.657 9 18 7.657 18 6C18 4.343 16.657 3 15 3C13.343 3 12.343 4.5 12 6C11.657 7.5 10.657 9 9 9C7.343 9 6 7.657 6 6Z" stroke="#0866FF" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        );

                        // Render helper for a single account row
                        const renderAccountRow = (acc: AccType) => (
                          <button
                            key={acc.id}
                            onClick={() => { setActiveAccount(acc.id); setShowAccountDropdown(false); }}
                            className={[
                              "w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors",
                              activeAccount?.id === acc.id ? "bg-brand/8 text-brand" : "hover:bg-foreground/5 text-foreground",
                            ].join(" ")}
                          >
                            <div className="relative shrink-0">
                              <Avatar className="w-6 h-6">
                                {acc.profile_picture && <AvatarImage src={acc.profile_picture} />}
                                <AvatarFallback className="text-[9px] bg-brand/10 text-brand font-semibold">
                                  {(acc.name ?? acc.username ?? acc.platform).charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-background border border-border/30 flex items-center justify-center">
                                <PlatformIcon platform={acc.platform} className="w-1.5 h-1.5" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium truncate">{acc.name ?? acc.username ?? acc.platform}</p>
                              {acc.account_type && (
                                <p className="text-[10px] text-muted-foreground/50 truncate capitalize">
                                  {acc.account_type === "ad_account" ? "Ad Account" : acc.account_type}
                                </p>
                              )}
                            </div>
                            {activeAccount?.id === acc.id && (
                              <svg className="w-3 h-3 shrink-0 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                            )}
                          </button>
                        );

                        return (
                          <>
                            {/* ── Meta named groups ── */}
                            {groups.map((group, idx) => (
                              <div key={`meta-group-${idx}`}>
                                <p className="text-[9px] font-semibold tracking-widest uppercase text-muted-foreground/40 px-4 pt-2 pb-1 flex items-center gap-1.5">
                                  <MetaLogo />
                                  {group.groupName}
                                </p>
                                {group.accounts.map(renderAccountRow)}
                              </div>
                            ))}

                            {/* ── Other platforms ── */}
                            {(() => {
                              const otherGrouped = otherAccounts.reduce<Record<string, AccType[]>>((acc, a) => {
                                if (!acc[a.platform]) acc[a.platform] = [];
                                acc[a.platform].push(a);
                                return acc;
                              }, {});
                              return Object.entries(otherGrouped).map(([platform, accs]) => (
                                <div key={platform}>
                                  <p className="text-[9px] font-semibold tracking-widest uppercase text-muted-foreground/40 px-4 pt-2 pb-1 flex items-center gap-1.5">
                                    <PlatformIcon platform={platform} className="w-2.5 h-2.5" />
                                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                                  </p>
                                  {accs.map(renderAccountRow)}
                                </div>
                              ));
                            })()}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* No accounts state */}
                  {accounts.length === 0 && (
                    <div className="py-6 text-center">
                      <Globe2 className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">{t("topbar.noAccounts")}</p>
                    </div>
                  )}

                  {/* Footer actions */}
                  <div className="px-3 py-2.5 border-t border-border/30">
                    {/* Manage Connections */}
                    <button
                      onClick={() => { setShowAccountDropdown(false); openSettings("connections"); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      Manage Connections
                    </button>
                  </div>
                </div>
              )}
            </div>
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

      {/* Sign Out Confirmation Dialog */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setShowSignOutConfirm(false)} />
          <div className="relative bg-background border border-border/50 rounded-2xl shadow-2xl w-full max-w-xs mx-4 p-6 flex flex-col items-center gap-4">
            {/* Icon */}
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            {/* Text */}
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">Sign out of Dashfields?</p>
              <p className="text-xs text-muted-foreground mt-1">You will need to sign in again to access your account.</p>
            </div>
            {/* Actions */}
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 py-2 rounded-xl border border-border/60 text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowSignOutConfirm(false); signOut(); }}
                className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
