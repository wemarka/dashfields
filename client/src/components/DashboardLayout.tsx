import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { NotificationBell } from "@/components/NotificationBell";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "@/i18n";
import {
  BarChart3, Bell, CalendarDays, ChevronLeft, ChevronRight,
  LayoutDashboard, LogOut, Megaphone, Settings, Sparkles,
  TrendingUp, Link2, Globe2, FileText, Users, Wand2,
  PieChart, GitCompare, Zap, Sun, Moon, User, Hash, Swords,
  Languages,
} from "lucide-react";
import { useState, useEffect } from "react";
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

// ─── Nav Item type ────────────────────────────────────────────────────────────
type NavItem = {
  icon: React.ElementType;
  labelKey: string;
  path: string;
  iconAnimation?: string;
};

type NavGroup = {
  labelKey: string | null;
  items: NavItem[];
};

// ─── Nav Structure ────────────────────────────────────────────────────────────
const navGroups: NavGroup[] = [
  {
    labelKey: null,
    items: [
      { icon: LayoutDashboard, labelKey: "nav.dashboard",    path: "/",              iconAnimation: "icon-bounce" },
    ],
  },
  {
    labelKey: "nav.groups.advertising",
    items: [
      { icon: Megaphone,   labelKey: "nav.campaigns",  path: "/campaigns",     iconAnimation: "icon-shake" },
      { icon: Bell,        labelKey: "nav.alerts",     path: "/alerts",        iconAnimation: "icon-bounce" },
    ],
  },
  {
    labelKey: "nav.groups.analytics",
    items: [
      { icon: BarChart3,   labelKey: "nav.overview",       path: "/analytics",     iconAnimation: "icon-pop" },
      { icon: Users,       labelKey: "nav.audience",        path: "/audience",      iconAnimation: "icon-bounce" },
      { icon: PieChart,    labelKey: "nav.postAnalytics",   path: "/post-analytics", iconAnimation: "icon-pop" },
      { icon: GitCompare,  labelKey: "nav.compare",         path: "/compare",       iconAnimation: "icon-spin" },
      { icon: Hash,        labelKey: "nav.hashtags",         path: "/hashtags",      iconAnimation: "icon-bounce" },
      { icon: Swords,      labelKey: "nav.competitors",      path: "/competitors",   iconAnimation: "icon-shake" },
    ],
  },
  {
    labelKey: "nav.groups.content",
    items: [
      { icon: CalendarDays, labelKey: "nav.calendar",    path: "/calendar",      iconAnimation: "icon-bounce" },
      { icon: Sparkles,     labelKey: "nav.aiStudio",    path: "/ai-content",    iconAnimation: "icon-pop" },
    ],
  },
  {
    labelKey: "nav.groups.reports",
    items: [
      { icon: FileText,    labelKey: "nav.reports",      path: "/reports",       iconAnimation: "icon-bounce" },
    ],
  },
];

const bottomItems: NavItem[] = [
  { icon: Link2,    labelKey: "nav.connections",   path: "/connections",  iconAnimation: "icon-pop" },
  { icon: Settings, labelKey: "nav.settings",      path: "/settings",     iconAnimation: "icon-spin" },
  { icon: User,     labelKey: "nav.profile",       path: "/profile",      iconAnimation: "icon-bounce" },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [location, setLocation] = useLocation();
  const { loading, user } = useAuth();
  const { dark, toggle: toggleDark } = useDarkMode();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => window.location.reload(),
  });

  const { data: accounts = [] } = trpc.social.list.useQuery();
  const connectedCount = accounts.length;

  const handleLangToggle = () => {
    const next = i18n.language === "ar" ? "en" : "ar";
    changeLanguage(next);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="app-bg flex h-screen items-center justify-center">
        <div className="glass rounded-2xl p-8 flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-10 h-10 rounded-full border-2 border-brand/20 border-t-brand animate-spin" />
          <p className="text-sm text-muted-foreground">{t("auth.loading")}</p>
        </div>
      </div>
    );
  }

  // ── Unauthenticated ────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="app-bg flex h-screen items-center justify-center">
        <div className="glass-strong rounded-3xl p-10 flex flex-col items-center gap-6 max-w-sm w-full mx-4 animate-blur-in">
          <div className="w-16 h-16 rounded-2xl bg-brand-subtle flex items-center justify-center">
            <Globe2 className="w-8 h-8 text-brand" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight mb-1 gradient-text">Dashfields</h1>
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

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div className={`app-bg flex h-screen overflow-hidden ${isRTL ? "flex-row-reverse" : ""}`}>
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className="glass-strong flex flex-col shrink-0 transition-all duration-300 ease-out m-3 rounded-2xl overflow-hidden relative"
        style={{ width: collapsed ? 64 : 228 }}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 h-14 border-b border-white/8 shrink-0 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center shrink-0 group cursor-pointer" onClick={() => setLocation("/")}>
            <Globe2 className="w-4 h-4 text-brand icon-pop" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <span className="font-bold text-sm tracking-tight truncate block leading-tight gradient-text">Dashfields</span>
              <span className="text-[9px] text-muted-foreground/45 tracking-widest uppercase">Social Hub</span>
            </div>
          )}
        </div>

        {/* Nav Groups */}
        <nav className={`flex-1 px-2 py-2 overflow-y-auto space-y-0.5 scrollbar-none ${isRTL ? "text-right" : ""}`}>
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-1" : ""}>
              {/* Group Label */}
              {group.labelKey && !collapsed && (
                <p className={`px-3 pt-2 pb-1 text-[9px] font-semibold tracking-widest uppercase text-muted-foreground/35 select-none ${isRTL ? "text-right" : ""}`}>
                  {t(group.labelKey)}
                </p>
              )}
              {group.labelKey && collapsed && gi > 0 && (
                <div className="mx-3 my-1.5 h-px bg-border/50" />
              )}
              {/* Items */}
              {group.items.map((item) => {
                const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
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
                    ].join(" ")}
                  >
                    {/* Active left border */}
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
                    {!collapsed && (
                      <span className="truncate flex-1">{t(item.labelKey)}</span>
                    )}
                    {isActive && !collapsed && (
                      <span className="nav-active-dot shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="px-2 pb-2 border-t border-white/8 pt-2 space-y-0.5">
          {bottomItems.map((item) => {
            const isActive = location === item.path || location.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                title={collapsed ? t(item.labelKey) : undefined}
                className={[
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium",
                  "transition-all duration-200 text-left group relative",
                  isRTL ? "flex-row-reverse text-right" : "text-left",
                  isActive
                    ? "bg-brand/10 text-brand"
                    : "text-foreground/55 hover:text-foreground hover:bg-foreground/5",
                ].join(" ")}
              >
                <item.icon
                  className={[
                    "w-4 h-4 shrink-0 transition-all duration-200",
                    item.iconAnimation ?? "",
                    isActive ? "text-brand" : "text-foreground/40 group-hover:text-foreground/70",
                  ].join(" ")}
                />
                {!collapsed && (
                  <span className="flex-1 truncate">{t(item.labelKey)}</span>
                )}
                {/* Connections badge */}
                {item.path === "/connections" && !collapsed && connectedCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-semibold">
                    {connectedCount}
                  </span>
                )}
                {item.path === "/connections" && collapsed && connectedCount > 0 && (
                  <span className="absolute right-2 top-2 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-ring" />
                )}
              </button>
            );
          })}

          {/* User Profile */}
          <div className={[
            "flex items-center gap-2.5 px-3 py-2 rounded-xl mt-1 border border-border/40",
            collapsed ? "justify-center" : "",
            isRTL ? "flex-row-reverse" : "",
          ].join(" ")}>
            <Avatar className="w-7 h-7 shrink-0">
              <AvatarFallback className="text-[11px] bg-brand/10 text-brand font-semibold">
                {user?.name?.charAt(0).toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className={`flex-1 min-w-0 ${isRTL ? "text-right" : ""}`}>
                <p className="text-[12px] font-semibold truncate leading-tight">{user?.name ?? "User"}</p>
                <button
                  onClick={() => logoutMutation.mutate()}
                  className="text-[11px] text-muted-foreground/55 hover:text-destructive transition-colors flex items-center gap-1 mt-0.5 group"
                >
                  <LogOut className="w-2.5 h-2.5 icon-bounce" />
                  {t("nav.signOut")}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={`absolute ${isRTL ? "-left-3" : "-right-3"} top-[72px] w-6 h-6 rounded-full glass-strong flex items-center justify-center hover:bg-brand/10 transition-colors z-10 shadow-sm border border-border/50`}
        >
          {(isRTL ? !collapsed : collapsed)
            ? <ChevronRight className="w-3 h-3 text-foreground/60 rtl-flip" />
            : <ChevronLeft className="w-3 h-3 text-foreground/60 rtl-flip" />
          }
        </button>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden min-w-0 flex flex-col">
        {/* Top bar */}
        <div className={`flex items-center justify-between px-6 py-2.5 border-b border-border/40 shrink-0 ${isRTL ? "flex-row-reverse" : ""}`}>
          {/* Left: connection status */}
          <div className="flex items-center gap-2">
            {connectedCount > 0 ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                {t("topbar.platformsConnected", { count: connectedCount })}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/45">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/25 inline-block" />
                {t("topbar.noPlatforms")}
              </div>
            )}
          </div>

          {/* Right: actions */}
          <div className={`flex items-center gap-1.5 ${isRTL ? "flex-row-reverse" : ""}`}>
            {/* Language toggle */}
            <button
              onClick={handleLangToggle}
              title={i18n.language === "ar" ? "Switch to English" : "التحويل للعربية"}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors group font-medium text-xs"
            >
              <span className="icon-pop text-[11px] font-semibold">
                {i18n.language === "ar" ? "EN" : "ع"}
              </span>
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              title={dark ? t("topbar.switchLight") : t("topbar.switchDark")}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors group"
            >
              {dark
                ? <Sun className="w-4 h-4 icon-spin" />
                : <Moon className="w-4 h-4 icon-bounce" />
              }
            </button>

            {/* Notifications */}
            <NotificationBell />
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
