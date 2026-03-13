/**
 * GlobalTopbar.tsx — Premium sticky topbar with glassmorphism.
 * Inspired by Vercel/Linear dark UI. Full viewport width, no sidebar.
 * Includes mobile hamburger menu for responsive navigation.
 */
import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/shared/hooks/useAuth";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { cn } from "@/core/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import {
  Home,
  MessageSquare,
  Palette,
  ChevronDown,
  Megaphone,
  BarChart3,
  FileText,
  FolderOpen,
  PenTool,
  User,
  Settings,
  LogOut,
  CreditCard,
  Zap,
  Building2,
  Check,
  Menu,
  X,
} from "lucide-react";
import { CreditUsageBar } from "./CreditUsageBar";

// ── Nav Items ─────────────────────────────────────────────────────────────
interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", path: "/dashboard", icon: <Home className="w-4 h-4" /> },
  { label: "Assist", path: "/assist", icon: <MessageSquare className="w-4 h-4" /> },
  { label: "Dash Studios", path: "/studios", icon: <Palette className="w-4 h-4" /> },
];

const MARKETING_ITEMS = [
  { label: "Campaigns", path: "/ads/campaigns", icon: <Megaphone className="w-4 h-4" /> },
  { label: "Content", path: "/content/planner", icon: <PenTool className="w-4 h-4" /> },
  { label: "Analytics", path: "/analytics/overview", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "Reports", path: "/analytics/reports", icon: <FileText className="w-4 h-4" /> },
];

export function GlobalTopbar() {
  const [location, setLocation] = useLocation();
  const { user, signOut } = useAuth();
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location === path || location.startsWith(path + "/");
  const isMarketingActive = MARKETING_ITEMS.some((item) => isActive(item.path));

  const initials = user?.name
    ? user.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const navigateMobile = (path: string) => {
    setLocation(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="glass-strong border-b border-white/[0.06]">
        <div className="flex items-center h-14 px-4 lg:px-6 gap-2">
          {/* ── Mobile Hamburger ──────────────────────────────────────── */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-muted-foreground"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* ── Logo ──────────────────────────────────────────────────── */}
          <Link href="/dashboard" className="flex items-center gap-2.5 mr-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground hidden sm:block">
              Dashfields
            </span>
          </Link>

          {/* ── Center Navigation (Desktop) ──────────────────────────── */}
          <nav className="hidden md:flex items-center gap-0.5 mx-auto">
            {NAV_ITEMS.map((item) => (
              <Link key={item.path} href={item.path}>
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200",
                    isActive(item.path)
                      ? "bg-white/[0.08] text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              </Link>
            ))}

            {/* Marketing Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200",
                    isMarketingActive
                      ? "bg-white/[0.08] text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                  )}
                >
                  <Megaphone className="w-4 h-4" />
                  <span>Marketing</span>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48 bg-popover border-white/[0.08]">
                {MARKETING_ITEMS.map((item) => (
                  <DropdownMenuItem
                    key={item.path}
                    onClick={() => setLocation(item.path)}
                    className={cn(
                      "flex items-center gap-2 cursor-pointer",
                      isActive(item.path) && "bg-white/[0.06]"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Assets */}
            <Link href="/assets">
              <button
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200",
                  isActive("/assets")
                    ? "bg-white/[0.08] text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                )}
              >
                <FolderOpen className="w-4 h-4" />
                <span>Assets</span>
              </button>
            </Link>
          </nav>

          {/* ── Spacer for mobile (pushes user menu to right) ────────── */}
          <div className="flex-1 md:hidden" />

          {/* ── Right Side: User Menu ─────────────────────────────────── */}
          <div className="flex items-center gap-2 shrink-0">
            <UserMenu
              user={user}
              initials={initials}
              workspaces={workspaces}
              activeWorkspace={activeWorkspace}
              setActiveWorkspace={setActiveWorkspace}
              signOut={signOut}
              setLocation={setLocation}
            />
          </div>
        </div>
      </div>

      {/* ── Mobile Navigation Drawer ───────────────────────────────────── */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed top-14 left-0 right-0 z-50 md:hidden glass-strong border-b border-white/[0.06] max-h-[calc(100vh-3.5rem)] overflow-y-auto animate-fade-in">
            <nav className="px-3 py-3 space-y-1">
              {/* Main Nav */}
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigateMobile(item.path)}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive(item.path)
                      ? "bg-white/[0.08] text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}

              {/* Marketing Section */}
              <div className="pt-2 pb-1">
                <span className="px-3 text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                  Marketing
                </span>
              </div>
              {MARKETING_ITEMS.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigateMobile(item.path)}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all pl-6",
                    isActive(item.path)
                      ? "bg-white/[0.08] text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}

              {/* Assets */}
              <button
                onClick={() => navigateMobile("/assets")}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive("/assets")
                    ? "bg-white/[0.08] text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                )}
              >
                <FolderOpen className="w-4 h-4" />
                Assets
              </button>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}

// ── User Menu Dropdown ───────────────────────────────────────────────────
function UserMenu({
  user,
  initials,
  workspaces,
  activeWorkspace,
  setActiveWorkspace,
  signOut,
  setLocation,
}: {
  user: { name?: string | null; email?: string | null; avatar_url?: string | null } | null;
  initials: string;
  workspaces: { id: number; name: string; plan: string }[];
  activeWorkspace: { id: number; name: string } | null;
  setActiveWorkspace: (id: number) => void;
  signOut: () => void;
  setLocation: (path: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-white/[0.04] transition-colors">
          <Avatar className="w-7 h-7 border border-white/[0.08]">
            <AvatarImage src={user?.avatar_url ?? undefined} />
            <AvatarFallback className="text-[10px] font-semibold bg-gradient-to-br from-violet-500/20 to-indigo-500/20 text-violet-300">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-popover border-white/[0.08] p-0">
        {/* Credit Usage */}
        <div className="px-3 py-3">
          <CreditUsageBar used={1240} total={5000} />
        </div>
        <DropdownMenuItem
          onClick={() => setLocation("/settings/billing")}
          className="mx-1 rounded-md cursor-pointer"
        >
          <div className="flex items-center gap-2 w-full">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <CreditCard className="w-3 h-3 text-amber-400" />
            </div>
            <span className="text-[13px] font-medium text-amber-400">Buy more credits</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/[0.06]" />

        {/* Workspace Switcher */}
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-3 py-1.5">
          Workspaces
        </DropdownMenuLabel>
        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => setActiveWorkspace(ws.id)}
            className="mx-1 rounded-md cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-white/[0.06] flex items-center justify-center">
                <Building2 className="w-3 h-3 text-muted-foreground" />
              </div>
              <span className="text-[13px]">{ws.name}</span>
            </div>
            {activeWorkspace?.id === ws.id && (
              <Check className="w-3.5 h-3.5 text-violet-400" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator className="bg-white/[0.06]" />

        {/* Profile & Settings */}
        <DropdownMenuItem
          onClick={() => setLocation("/profile")}
          className="mx-1 rounded-md cursor-pointer"
        >
          <User className="w-4 h-4 mr-2" />
          <span className="text-[13px]">View Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLocation("/settings/workspace")}
          className="mx-1 rounded-md cursor-pointer"
        >
          <Settings className="w-4 h-4 mr-2" />
          <span className="text-[13px]">Settings</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/[0.06]" />

        {/* Sign Out */}
        <DropdownMenuItem
          onClick={signOut}
          className="mx-1 mb-1 rounded-md cursor-pointer text-red-400 focus:text-red-400"
        >
          <LogOut className="w-4 h-4 mr-2" />
          <span className="text-[13px]">Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
