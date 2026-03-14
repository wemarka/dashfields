/**
 * PlatformAccountCard — displays a single connected social account
 * with platform icon, name, follower count, and trend indicator.
 */
import { TrendingUp, TrendingDown, Minus, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/core/lib/utils";

// ─── Platform config ──────────────────────────────────────────────────────────
export interface PlatformConfig {
  id: string;
  label: string;
  color: string;        // Tailwind bg class for avatar
  textColor: string;    // Tailwind text class
  icon: React.ReactNode;
}

const PLATFORM_ICONS: Record<string, { color: string; textColor: string; label: string; icon: React.ReactNode }> = {
  facebook: {
    color: "bg-neutral-800",
    textColor: "text-white",
    label: "Facebook",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  instagram: {
    color: "bg-neutral-700",
    textColor: "text-white",
    label: "Instagram",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  twitter: {
    color: "bg-black",
    textColor: "text-white",
    label: "X (Twitter)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  linkedin: {
    color: "bg-neutral-800",
    textColor: "text-white",
    label: "LinkedIn",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  youtube: {
    color: "bg-[#E62020]/14",
    textColor: "text-white",
    label: "YouTube",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  tiktok: {
    color: "bg-black",
    textColor: "text-white",
    label: "TikTok",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
      </svg>
    ),
  },
  snapchat: {
    color: "bg-[#f59e0b]/14",
    textColor: "text-black",
    label: "Snapchat",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z"/>
      </svg>
    ),
  },
  pinterest: {
    color: "bg-[#E62020]/14",
    textColor: "text-white",
    label: "Pinterest",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
      </svg>
    ),
  },
  google: {
    color: "bg-neutral-900 border border-neutral-700",
    textColor: "text-neutral-300",
    label: "Google",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AccountData {
  id: number;
  platform: string;
  name: string;
  username?: string;
  profilePicture?: string;
  isActive: boolean;
  followers?: number;
  followersChange?: number;   // absolute change (+ or -)
  followersChangePct?: number; // percentage change
  accountType?: string;
  metadata?: Record<string, unknown>;
}

interface PlatformAccountCardProps {
  account: AccountData;
  onClick?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ─── Component ────────────────────────────────────────────────────────────────
export function PlatformAccountCard({ account, onClick }: PlatformAccountCardProps) {
  const cfg = PLATFORM_ICONS[account.platform] ?? {
    color: "bg-neutral-800/500",
    textColor: "text-white",
    label: account.platform,
    icon: <span className="text-xs font-bold">{account.platform[0].toUpperCase()}</span>,
  };

  const trendUp   = (account.followersChangePct ?? 0) > 0;
  const trendDown = (account.followersChangePct ?? 0) < 0;
  const trendFlat = !trendUp && !trendDown;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-5",
        "hover:border-border hover:shadow-sm transition-all duration-200 cursor-pointer",
        !account.isActive && "opacity-60"
      )}
    >
      {/* Header: platform avatar + name + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Platform icon */}
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", cfg.color, cfg.textColor)}>
            {cfg.icon}
          </div>
          {/* Name + username */}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{account.name}</p>
            {account.username && (
              <p className="text-xs text-muted-foreground truncate">@{account.username}</p>
            )}
            <p className="text-xs text-muted-foreground/70 mt-0.5">{cfg.label}</p>
          </div>
        </div>
        {/* Status badge */}
        <div className={cn(
          "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full shrink-0",
          account.isActive
            ? "bg-muted/40 text-foreground"
            : "bg-brand/10 text-brand"
        )}>
          {account.isActive
            ? <CheckCircle2 className="w-3 h-3" />
            : <AlertCircle className="w-3 h-3" />
          }
          {account.isActive ? "Connected" : "Disconnected"}
        </div>
      </div>

      {/* Followers stats */}
      {account.followers !== undefined ? (
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Followers</p>
            <p className="text-2xl font-bold text-foreground tracking-tight">
              {formatFollowers(account.followers)}
            </p>
          </div>
          {/* Trend indicator */}
          <div className={cn(
            "flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded-xl",
            trendUp   && "bg-muted/40 text-muted-foreground",
            trendDown && "bg-brand/10 text-brand",
            trendFlat && "bg-muted text-muted-foreground"
          )}>
            {trendUp   && <TrendingUp  className="w-4 h-4" />}
            {trendDown && <TrendingDown className="w-4 h-4" />}
            {trendFlat && <Minus className="w-4 h-4" />}
            <span>
              {trendFlat
                ? "—"
                : `${trendUp ? "+" : ""}${account.followersChangePct?.toFixed(1)}%`
              }
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ExternalLink className="w-3.5 h-3.5" />
          <span>No follower data available</span>
        </div>
      )}

      {/* Absolute change label */}
      {account.followersChange !== undefined && account.followersChange !== 0 && (
        <p className={cn(
          "text-xs font-medium",
          account.followersChange > 0 ? "text-muted-foreground" : "text-brand"
        )}>
          {account.followersChange > 0 ? "+" : ""}
          {formatFollowers(Math.abs(account.followersChange))} this month
        </p>
      )}
    </div>
  );
}
