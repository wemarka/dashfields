// MobileBottomNav.tsx — Persistent bottom navigation for mobile screens
// Mirrors the ultra-minimalist sidebar: Dashboard, Ads, Content, Analytics, Settings
import { useLocation, Link } from "wouter";
import {
  LayoutDashboard, Megaphone, PenSquare, BarChart3, Settings,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const NAV_ITEMS = [
  { icon: LayoutDashboard, labelKey: "nav.dashboard", path: "/dashboard",             matchPrefix: "/dashboard" },
  { icon: Megaphone,       labelKey: "nav.ads",       path: "/ads/campaigns",         matchPrefix: "/ads" },
  { icon: PenSquare,       labelKey: "nav.content",   path: "/content/planner",       matchPrefix: "/content" },
  { icon: BarChart3,       labelKey: "nav.analytics", path: "/analytics/overview",    matchPrefix: "/analytics" },
  { icon: Settings,        labelKey: "nav.settings",  path: "/settings/integrations", matchPrefix: "/settings" },
];

export function MobileBottomNav() {
  const [location] = useLocation();
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-xl border-t border-border/50 safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ icon: Icon, labelKey, path, matchPrefix }) => {
          const isActive = location === matchPrefix || location.startsWith(matchPrefix + "/");
          return (
            <Link key={path} href={path}>
              <button
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                  isActive
                    ? "text-brand"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className={`relative p-1.5 rounded-xl transition-all ${isActive ? "bg-brand/10" : ""}`}>
                  <Icon className="w-5 h-5" />
                  {isActive && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-brand" />
                  )}
                </div>
                <span className="text-[10px] font-medium leading-none">{t(labelKey)}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
