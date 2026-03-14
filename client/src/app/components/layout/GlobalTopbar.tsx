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
  Building2,
  Check,
  Menu,
  X,
} from "lucide-react";
import { CreditUsageBar } from "./CreditUsageBar";
import { DashStudiosLogo } from "./DashStudiosLogo";

// ── Nav Items ─────────────────────────────────────────────────────────────
interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", path: "/dashboard", icon: <Home className="w-4 h-4" /> },
  { label: "Assist", path: "/assist", icon: <MessageSquare className="w-4 h-4" /> },
];

const MARKETING_ITEMS = [
  { label: "Dashboard", path: "/marketing/dashboard", icon: <BarChart3 className="w-4 h-4" /> },
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
      <div className="glass-strong border-b border-neutral-800">
        <div className="flex items-center h-14 px-4 lg:px-6 gap-2">
          {/* ── Mobile Hamburger ──────────────────────────────────────── */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg hover:bg-neutral-800 transition-colors text-neutral-400"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* ── Logo ──────────────────────────────────────────────────── */}
          <Link href="/dashboard" className="group/logo flex items-center mr-3 shrink-0">
            <svg viewBox="0 0 5504 3072" className="w-10 h-10 transition-transform duration-300 ease-out hover:scale-110" aria-label="Dashfields icon">
              <path className="fill-white group-hover/logo:fill-brand transition-[fill] duration-300 ease-out" d="M820.93,2705.08c145.31-177.32,317.52-332.5,481.07-493.35l949.38-8.15,1430.87-1391.02h-1030.75l-405.54,416.81H629.42l128.93-135.79,1031.16-16.49,830.49-847.99s1654.12-2.78,1654.12-2.78c311.83,50.91,413.84,408.84,197.12,637.4-642.55,606.59-1270.6,1230.84-1909.88,1841.37H820.93Z" />
              <polygon className="fill-white group-hover/logo:fill-brand transition-[fill] duration-300 ease-out" points="2420.56 1477.19 2167.1 1736.28 1153.25 1736.28 1141.87 1713.75 1378.55 1477.19 2420.56 1477.19" />
            </svg>
          </Link>

          {/* ── Center Navigation (Desktop) ──────────────────────────── */}
          <nav className="hidden md:flex items-center gap-0.5 mx-auto">
            {NAV_ITEMS.map((item) => (
              <Link key={item.path} href={item.path}>
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200",
                    isActive(item.path)
                      ? "bg-neutral-800 text-white shadow-sm"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              </Link>
            ))}

            {/* Dash Studios — SVG Logo with cinematic animation */}
            <Link href="/studios">
              <button
                className={cn(
                  "flex items-center px-3 py-2 rounded-lg transition-all duration-300 ease-out",
                  isActive("/studios")
                    ? "bg-neutral-800/80 shadow-sm shadow-brand-red/10"
                    : "hover:bg-neutral-800/40"
                )}
              >
                <DashStudiosLogo className="h-5" />
              </button>
            </Link>

            {/* Marketing Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200",
                    isMarketingActive
                      ? "bg-neutral-800 text-white shadow-sm"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
                  )}
                >
                  <Megaphone className="w-4 h-4" />
                  <span>Marketing</span>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48 bg-neutral-900 border-neutral-800">
                {MARKETING_ITEMS.map((item) => (
                  <DropdownMenuItem
                    key={item.path}
                    onClick={() => setLocation(item.path)}
                    className={cn(
                      "flex items-center gap-2 cursor-pointer",
                      isActive(item.path) && "bg-neutral-800"
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
                    ? "bg-neutral-800 text-white shadow-sm"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
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
          <div className="fixed top-14 left-0 right-0 z-50 md:hidden glass-strong border-b border-neutral-800 max-h-[calc(100vh-3.5rem)] overflow-y-auto animate-fade-in">
            <nav className="px-3 py-3 space-y-1">
              {/* Main Nav */}
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigateMobile(item.path)}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive(item.path)
                      ? "bg-neutral-800 text-white"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}

              {/* Dash Studios — SVG Logo (Mobile) */}
              <button
                onClick={() => navigateMobile("/studios")}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive("/studios")
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
                )}
              >
                <DashStudiosLogo className="h-4" />
              </button>

              {/* Marketing Section */}
              <div className="pt-2 pb-1">
                <span className="px-3 text-[11px] uppercase tracking-wider text-neutral-500 font-medium">
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
                      ? "bg-neutral-800 text-white"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
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
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
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
        <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-neutral-800 transition-colors">
          <Avatar className="w-7 h-7 border border-neutral-700">
            <AvatarImage src={user?.avatar_url ?? undefined} />
            <AvatarFallback className="text-[10px] font-semibold bg-neutral-800 text-neutral-300">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-neutral-900 border-neutral-800 p-0">
        {/* Credit Usage */}
        <div className="px-3 py-3">
          <CreditUsageBar used={1240} total={5000} />
        </div>
        <DropdownMenuItem
          onClick={() => setLocation("/settings/billing")}
          className="mx-1 rounded-md cursor-pointer"
        >
          <div className="flex items-center gap-2 w-full">
            <div className="w-5 h-5 rounded-md bg-brand/10 flex items-center justify-center">
              <CreditCard className="w-3 h-3 text-brand" />
            </div>
            <span className="text-[13px] font-medium text-brand">Buy more credits</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-neutral-800" />

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
              <div className="w-5 h-5 rounded-md bg-neutral-800 flex items-center justify-center">
                <Building2 className="w-3 h-3 text-muted-foreground" />
              </div>
              <span className="text-[13px]">{ws.name}</span>
            </div>
            {activeWorkspace?.id === ws.id && (
              <Check className="w-3.5 h-3.5 text-brand" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator className="bg-neutral-800" />

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

        <DropdownMenuSeparator className="bg-neutral-800" />

        {/* Sign Out */}
        <DropdownMenuItem
          onClick={signOut}
          className="mx-1 mb-1 rounded-md cursor-pointer text-[#f87171] focus:text-[#f87171]"
        >
          <LogOut className="w-4 h-4 mr-2" />
          <span className="text-[13px]">Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
