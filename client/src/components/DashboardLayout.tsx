import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { NotificationBell } from "@/components/NotificationBell";
import {
  BarChart3, Bell, CalendarDays, ChevronLeft, ChevronRight,
  LayoutDashboard, LogOut, Megaphone, Settings, Sparkles,
  TrendingUp, Link2, Globe2, FileText, Users, Wand2,
  PieChart, GitCompare, Zap, Sun, Moon, User, Hash,
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

// ─── Nav Structure ────────────────────────────────────────────────────────────
const navGroups = [
  {
    label: null, // no label for top-level
    items: [
      { icon: LayoutDashboard, label: "Dashboard",   path: "/" },
    ],
  },
  {
    label: "Advertising",
    items: [
      { icon: Megaphone,   label: "Campaigns",  path: "/campaigns" },
      { icon: Bell,        label: "Alerts",     path: "/alerts" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { icon: BarChart3,   label: "Overview",       path: "/analytics" },
      { icon: Users,       label: "Audience",        path: "/audience" },
      { icon: PieChart,    label: "Post Analytics",  path: "/post-analytics" },
      { icon: GitCompare,  label: "Compare",         path: "/compare" },
      { icon: Hash,        label: "Hashtags",         path: "/hashtags" },
    ],
  },
  {
    label: "Content",
    items: [
      { icon: CalendarDays, label: "Calendar",    path: "/calendar" },
      { icon: Sparkles,     label: "AI Studio",   path: "/ai-content" },
    ],
  },
  {
    label: "Reports",
    items: [
      { icon: FileText,    label: "Reports",      path: "/reports" },
    ],
  },
];

const bottomItems = [
  { icon: Link2,    label: "Connections",   path: "/connections" },
  { icon: Settings, label: "Settings",      path: "/settings" },
  { icon: User,     label: "Profile",       path: "/profile" },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [location, setLocation] = useLocation();
  const { loading, user } = useAuth();
  const { dark, toggle: toggleDark } = useDarkMode();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => window.location.reload(),
  });

  const { data: accounts = [] } = trpc.social.list.useQuery();
  const { data: metaStatus } = trpc.meta.connectionStatus.useQuery();
  const connectedCount = accounts.length + (metaStatus?.connected ? 1 : 0);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="app-bg flex h-screen items-center justify-center">
        <div className="glass rounded-2xl p-8 flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-foreground/20 border-t-foreground/80 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading Dashfields...</p>
        </div>
      </div>
    );
  }

  // ── Unauthenticated ────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="app-bg flex h-screen items-center justify-center">
        <div className="glass-strong rounded-3xl p-10 flex flex-col items-center gap-6 max-w-sm w-full mx-4 animate-blur-in">
          <div className="w-16 h-16 rounded-2xl bg-foreground/5 flex items-center justify-center">
            <Globe2 className="w-8 h-8 text-foreground/70" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight mb-1">Dashfields</h1>
            <p className="text-[10px] text-muted-foreground/70 tracking-widest uppercase mb-2">All Platforms. One Dashboard.</p>
            <p className="text-sm text-muted-foreground">Sign in to manage your social media</p>
          </div>
          <a
            href={getLoginUrl()}
            className="w-full py-3 px-6 rounded-xl bg-foreground text-background text-sm font-medium text-center hover:bg-foreground/90 transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div className="app-bg flex h-screen overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className="glass-strong flex flex-col shrink-0 transition-all duration-300 ease-out m-3 rounded-2xl overflow-hidden relative"
        style={{ width: collapsed ? 64 : 224 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-white/8 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-foreground/8 flex items-center justify-center shrink-0">
            <Globe2 className="w-3.5 h-3.5 text-foreground/70" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-semibold text-sm tracking-tight truncate block leading-tight">Dashfields</span>
              <span className="text-[9px] text-muted-foreground/50 tracking-widest uppercase">Social Hub</span>
            </div>
          )}
        </div>

        {/* Nav Groups */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-0.5 scrollbar-none">
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-1" : ""}>
              {/* Group Label */}
              {group.label && !collapsed && (
                <p className="px-3 pt-2 pb-1 text-[9px] font-semibold tracking-widest uppercase text-muted-foreground/40 select-none">
                  {group.label}
                </p>
              )}
              {group.label && collapsed && gi > 0 && (
                <div className="mx-3 my-1.5 h-px bg-white/8" />
              )}
              {/* Items */}
              {group.items.map((item) => {
                const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
                return (
                  <button
                    key={item.path}
                    onClick={() => setLocation(item.path)}
                    title={collapsed ? item.label : undefined}
                    className={[
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium",
                      "transition-all duration-150 text-left group",
                      isActive
                        ? "bg-foreground/10 text-foreground"
                        : "text-foreground/55 hover:text-foreground hover:bg-foreground/5",
                    ].join(" ")}
                  >
                    <item.icon
                      className={[
                        "w-4 h-4 shrink-0 transition-colors",
                        isActive ? "text-foreground" : "text-foreground/40 group-hover:text-foreground/70",
                      ].join(" ")}
                    />
                    {!collapsed && (
                      <span className="truncate text-[13px]">{item.label}</span>
                    )}
                    {isActive && !collapsed && (
                      <span className="ml-auto w-1 h-1 rounded-full bg-foreground/50 shrink-0" />
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
                title={collapsed ? item.label : undefined}
                className={[
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium",
                  "transition-all duration-150 text-left group relative",
                  isActive
                    ? "bg-foreground/10 text-foreground"
                    : "text-foreground/55 hover:text-foreground hover:bg-foreground/5",
                ].join(" ")}
              >
                <item.icon className="w-4 h-4 shrink-0 text-foreground/40 group-hover:text-foreground/70 transition-colors" />
                {!collapsed && (
                  <span className="flex-1 truncate text-[13px]">{item.label}</span>
                )}
                {/* Connections badge */}
                {item.path === "/connections" && !collapsed && connectedCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold">
                    {connectedCount}
                  </span>
                )}
                {item.path === "/connections" && collapsed && connectedCount > 0 && (
                  <span className="absolute right-2 top-2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}

          {/* User Profile */}
          <div className={[
            "flex items-center gap-2.5 px-3 py-2 rounded-xl mt-1",
            collapsed ? "justify-center" : "",
          ].join(" ")}>
            <Avatar className="w-6 h-6 shrink-0">
              <AvatarFallback className="text-[10px] bg-foreground/10 text-foreground/70">
                {user?.name?.charAt(0).toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium truncate leading-tight">{user?.name ?? "User"}</p>
                <button
                  onClick={() => logoutMutation.mutate()}
                  className="text-[11px] text-muted-foreground/60 hover:text-destructive transition-colors flex items-center gap-1 mt-0.5"
                >
                  <LogOut className="w-2.5 h-2.5" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-[72px] w-6 h-6 rounded-full glass-strong flex items-center justify-center hover:bg-foreground/10 transition-colors z-10 shadow-sm border border-white/15"
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3 text-foreground/60" />
            : <ChevronLeft className="w-3 h-3 text-foreground/60" />
          }
        </button>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto min-w-0 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-2.5 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-2">
            {connectedCount > 0 ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                {connectedCount} platform{connectedCount !== 1 ? "s" : ""} connected
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 inline-block" />
                No platforms connected
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDark}
              title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <NotificationBell />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
