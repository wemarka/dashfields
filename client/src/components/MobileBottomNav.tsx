/**
 * MobileBottomNav.tsx — Persistent bottom navigation for mobile screens
 * Shows the 5 most important nav items. Hidden on md+ screens.
 */
import { useLocation, Link } from "wouter";
import {
  LayoutDashboard, Megaphone, BarChart3,
  CalendarDays, Link2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const NAV_ITEMS = [
  { icon: LayoutDashboard, labelKey: "nav.dashboard",   path: "/" },
  { icon: Megaphone,       labelKey: "nav.campaigns",   path: "/campaigns" },
  { icon: BarChart3,       labelKey: "nav.overview",    path: "/analytics" },
  { icon: CalendarDays,    labelKey: "nav.calendar",    path: "/calendar" },
  { icon: Link2,           labelKey: "nav.connections", path: "/connections" },
];

export function MobileBottomNav() {
  const [location] = useLocation();
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-xl border-t border-border/50 safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ icon: Icon, labelKey, path }) => {
          const isActive = path === "/" ? location === "/" : location.startsWith(path);
          return (
            <Link key={path} href={path}>
              <button
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className={`relative p-1.5 rounded-xl transition-all ${isActive ? "bg-primary/10" : ""}`}>
                  <Icon className="w-5 h-5" />
                  {isActive && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
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
