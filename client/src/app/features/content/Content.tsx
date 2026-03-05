// Content.tsx — Unified Content Hub
// 3 tabs: Planner | AI Studio | Assets
import { useState, useEffect, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { CalendarDays, Sparkles, Layers } from "lucide-react";
import { usePageTitle } from "@/shared/hooks/usePageTitle";

const PlannerTab   = lazy(() => import("./tabs/PlannerTab"));
const AIStudioTab  = lazy(() => import("./tabs/AIStudioTab"));
const AssetsTab    = lazy(() => import("./tabs/AssetsTab"));

type Tab = "planner" | "ai-studio" | "assets";

const TABS: { id: Tab; labelKey: string; icon: React.ElementType }[] = [
  { id: "planner",   labelKey: "content.tabs.planner",  icon: CalendarDays },
  { id: "ai-studio", labelKey: "content.tabs.aiStudio", icon: Sparkles },
  { id: "assets",    labelKey: "content.tabs.assets",   icon: Layers },
];

function TabSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded-xl" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-2xl" />
        ))}
      </div>
      <div className="h-80 bg-muted rounded-2xl" />
    </div>
  );
}

export default function Content() {
  usePageTitle("Content");
  const { t } = useTranslation();
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("planner");

  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as Tab;
    if (TABS.some(tab => tab.id === hash)) setActiveTab(hash);
  }, [location]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", `/content#${tab}`);
  };

  return (
      <div className="flex flex-col h-full">
        {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 px-6 pt-4 pb-0 border-b border-border/40 shrink-0">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={[
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all duration-200 relative",
                  isActive
                    ? "text-brand bg-brand/5 border-b-2 border-brand -mb-px"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/5",
                ].join(" ")}
              >
                <tab.icon className={`w-4 h-4 ${isActive ? "text-brand" : ""}`} />
                {t(tab.labelKey, tab.id.charAt(0).toUpperCase() + tab.id.slice(1))}
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto">
          <Suspense fallback={<TabSkeleton />}>
            {activeTab === "planner"   && <PlannerTab />}
            {activeTab === "ai-studio" && <AIStudioTab />}
            {activeTab === "assets"    && <AssetsTab />}
          </Suspense>
        </div>
      </div>
  );
}
