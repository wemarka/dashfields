/**
 * SentimentDashboard.tsx — Main page orchestrator.
 * All tab logic lives in ./tabs/ submodules.
 */
import { useState } from "react";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { Brain, Upload, History, BarChart2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { QuickAnalyzeTab, BulkAnalyzeTab, HistoryTab, DashboardTab, type Tab } from "./tabs";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "quick",     label: "Quick Analyze", icon: Brain    },
  { id: "bulk",      label: "Bulk Analyze",  icon: Upload   },
  { id: "history",   label: "History",       icon: History  },
  { id: "dashboard", label: "Dashboard",     icon: BarChart2 },
];

export default function SentimentDashboard() {
  usePageTitle("Sentiment Analysis");
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("quick");

  return (
    <>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Brain className="w-6 h-6 text-violet-500" />
              Sentiment Analysis
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Analyze the emotional tone of your content and get AI-powered improvement suggestions
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-2xl p-1.5 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "quick"     && <QuickAnalyzeTab />}
        {activeTab === "bulk"      && <BulkAnalyzeTab />}
        {activeTab === "history"   && <HistoryTab />}
        {activeTab === "dashboard" && <DashboardTab />}
      </div>
    </>
  );
}
