// Ads.tsx — Unified Ads Hub
// 4 tabs: Campaigns | Audiences | Performance | AI Analyzer
// Each tab renders the existing feature page stripped of its DashboardLayout wrapper.
import { useState, useEffect, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Megaphone, Users, BarChart3, Zap } from "lucide-react";
import { usePageTitle } from "@/shared/hooks/usePageTitle";

// ─── Inline tab content (lazy) ────────────────────────────────────────────────
const CampaignsTab    = lazy(() => import("./tabs/CampaignsTab"));
const AudiencesTab    = lazy(() => import("./tabs/AudiencesTab"));
const PerformanceTab  = lazy(() => import("./tabs/PerformanceTab"));
const AIAnalyzerTab   = lazy(() => import("./tabs/AIAnalyzerTab"));

type Tab = "campaigns" | "audiences" | "performance" | "ai-analyzer";

const TABS: { id: Tab; labelKey: string; icon: React.ElementType }[] = [
  { id: "campaigns",   labelKey: "ads.tabs.campaigns",   icon: Megaphone },
  { id: "audiences",   labelKey: "ads.tabs.audiences",   icon: Users },
  { id: "performance", labelKey: "ads.tabs.performance", icon: BarChart3 },
  { id: "ai-analyzer", labelKey: "ads.tabs.aiAnalyzer",  icon: Zap },
];

function TabSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded-xl" />
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-2xl" />
        ))}
      </div>
      <div className="h-64 bg-muted rounded-2xl" />
    </div>
  );
}

export default function Ads() {
  usePageTitle("Ads");
  const { t } = useTranslation();
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("campaigns");

  // Support URL hash for direct tab access: /ads#audiences
  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as Tab;
    if (TABS.some(tab => tab.id === hash)) setActiveTab(hash);
  }, [location]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", `/ads#${tab}`);
  };

  return (
    <>
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
            {activeTab === "campaigns"   && <CampaignsTab />}
            {activeTab === "audiences"   && <AudiencesTab />}
            {activeTab === "performance" && <PerformanceTab />}
            {activeTab === "ai-analyzer" && <AIAnalyzerTab />}
          </Suspense>
        </div>
      </div>
    </>
  );
}
