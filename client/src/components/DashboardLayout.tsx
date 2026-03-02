import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  BarChart3, Calendar, ChevronLeft, ChevronRight,
  LayoutDashboard, LogOut, Megaphone, Settings, Sparkles, TrendingUp, Facebook,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard",  path: "/" },
  { icon: Megaphone,       label: "Campaigns",  path: "/campaigns" },
  { icon: BarChart3,       label: "Analytics",  path: "/analytics" },
  { icon: Calendar,        label: "Publishing", path: "/publishing" },
  { icon: TrendingUp,      label: "Insights",   path: "/insights" },
  { icon: Sparkles,        label: "AI Tools",   path: "/ai-tools" },
];

const bottomItems = [
  { icon: Facebook, label: "Meta Ads",  path: "/meta-connect" },
  { icon: Settings, label: "Settings",  path: "/settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [location, setLocation] = useLocation();
  const { loading, user } = useAuth();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => window.location.reload(),
  });

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

  if (!user) {
    return (
      <div className="app-bg flex h-screen items-center justify-center">
        <div className="glass-strong rounded-3xl p-10 flex flex-col items-center gap-6 max-w-sm w-full mx-4 animate-blur-in">
          <div className="w-16 h-16 rounded-2xl bg-foreground/5 flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-foreground/70" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight mb-2">Dashfields</h1>
            <p className="text-sm text-muted-foreground">Sign in to manage your campaigns</p>
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

  return (
    <div className="app-bg flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className="glass-strong flex flex-col shrink-0 transition-all duration-300 ease-out m-3 rounded-2xl overflow-hidden relative"
        style={{ width: collapsed ? 64 : 220 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10">
          <div className="w-8 h-8 rounded-xl bg-foreground/8 flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4 text-foreground/70" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm tracking-tight truncate">Dashfields</span>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                title={collapsed ? item.label : undefined}
                className={[
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                  "transition-all duration-200 text-left",
                  isActive
                    ? "bg-foreground/10 text-foreground shadow-sm"
                    : "text-foreground/60 hover:text-foreground hover:bg-foreground/5",
                ].join(" ")}
              >
                <item.icon className={"w-4 h-4 shrink-0 " + (isActive ? "text-foreground" : "text-foreground/50")} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-2 pb-2 space-y-0.5 border-t border-white/10 pt-2">
          {bottomItems.map((item) => {
            const isActive = location === item.path;
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                title={collapsed ? item.label : undefined}
                className={[
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                  "transition-all duration-200 text-left",
                  isActive
                    ? "bg-foreground/10 text-foreground"
                    : "text-foreground/60 hover:text-foreground hover:bg-foreground/5",
                ].join(" ")}
              >
                <item.icon className="w-4 h-4 shrink-0 text-foreground/50" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}

          {/* User */}
          <div className={"flex items-center gap-3 px-3 py-2.5 rounded-xl " + (collapsed ? "justify-center" : "")}>
            <Avatar className="w-7 h-7 shrink-0">
              <AvatarFallback className="text-xs bg-foreground/10 text-foreground/70">
                {user?.name?.charAt(0).toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{user?.name ?? "User"}</p>
                <button
                  onClick={() => logoutMutation.mutate()}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full glass-strong flex items-center justify-center hover:bg-foreground/10 transition-colors z-10 shadow-sm border border-white/20"
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3 text-foreground/60" />
            : <ChevronLeft className="w-3 h-3 text-foreground/60" />
          }
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
