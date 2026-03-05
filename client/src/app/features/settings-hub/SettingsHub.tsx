// SettingsHub.tsx — Unified Settings Hub
// 3 tabs: Integrations | Workspace & Team | Billing
import { useState, useEffect, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Link2, Building2, CreditCard } from "lucide-react";
import { usePageTitle } from "@/shared/hooks/usePageTitle";

const IntegrationsTab    = lazy(() => import("./tabs/IntegrationsTab"));
const WorkspaceTeamTab   = lazy(() => import("./tabs/WorkspaceTeamTab"));
const BillingTab         = lazy(() => import("./tabs/BillingTab"));

type Tab = "integrations" | "workspace" | "billing";

const TABS: { id: Tab; labelKey: string; icon: React.ElementType }[] = [
  { id: "integrations", labelKey: "settings.tabs.integrations", icon: Link2 },
  { id: "workspace",    labelKey: "settings.tabs.workspace",    icon: Building2 },
  { id: "billing",      labelKey: "settings.tabs.billing",      icon: CreditCard },
];

function TabSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function SettingsHub() {
  usePageTitle("Settings");
  const { t } = useTranslation();
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("integrations");

  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as Tab;
    if (TABS.some(tab => tab.id === hash)) setActiveTab(hash);
  }, [location]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", `/settings#${tab}`);
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
            {activeTab === "integrations" && <IntegrationsTab />}
            {activeTab === "workspace"    && <WorkspaceTeamTab />}
            {activeTab === "billing"      && <BillingTab />}
          </Suspense>
        </div>
      </div>
    </>
  );
}
