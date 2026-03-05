// SmartRecommendationsWidget.tsx
// AI-powered smart recommendations widget for the Dashboard.
import { useState } from "react";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { useLocation } from "wouter";
import {
  Sparkles, TrendingUp, AlertTriangle, CheckCircle, Info,
  RefreshCw, ArrowRight, Zap, Target, Users, Clock, Layers, FileText,
  ChevronDown, ChevronUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Recommendation {
  id: string;
  type: "opportunity" | "warning" | "success" | "info";
  category: "budget" | "creative" | "audience" | "timing" | "platform" | "content";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  impact: string;
  action: string;
  actionUrl?: string;
  metric?: { label: string; value: string; change?: string; trend?: "up" | "down" | "neutral" };
}

// ─── Config ───────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  opportunity: {
    icon: TrendingUp,
    bg: "bg-emerald-50 border-emerald-200/60",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-50 border-amber-200/60",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    badge: "bg-amber-100 text-amber-700",
  },
  success: {
    icon: CheckCircle,
    bg: "bg-blue-50 border-blue-200/60",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    badge: "bg-blue-100 text-blue-700",
  },
  info: {
    icon: Info,
    bg: "bg-purple-50 border-purple-200/60",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    badge: "bg-purple-100 text-purple-700",
  },
};

const CATEGORY_ICONS = {
  budget: Zap,
  creative: Layers,
  audience: Users,
  timing: Clock,
  platform: Target,
  content: FileText,
};

const PRIORITY_COLORS = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-gray-100 text-gray-600",
};

// ─── Component ────────────────────────────────────────────────────────────────
export function SmartRecommendationsWidget() {
  const { activeWorkspace } = useWorkspace();
  const [, setLocation] = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, isLoading, refetch, isFetching } = trpc.smartRecommendations.generate.useQuery(
    { workspaceId: activeWorkspace?.id, language: "en", forceRefresh: refreshKey > 0 },
    { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
  );

  const scoreQuery = trpc.smartRecommendations.performanceScore.useQuery(
    { workspaceId: activeWorkspace?.id },
    { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
  );

  const recommendations = data?.recommendations ?? [];
  const visibleRecs = expanded ? recommendations : recommendations.slice(0, 3);
  const score = scoreQuery.data;

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
    void refetch();
  };

  const handleAction = (rec: Recommendation) => {
    if (rec.actionUrl) setLocation(rec.actionUrl);
  };

  return (
    <div className="glass rounded-2xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI Smart Recommendations</h3>
            <p className="text-[11px] text-muted-foreground">Based on your real performance data</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {score && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-foreground/5">
              <span className="text-[11px] text-muted-foreground">Score</span>
              <span className={`text-sm font-bold ${
                score.score >= 70 ? "text-emerald-600" :
                score.score >= 50 ? "text-amber-600" : "text-red-600"
              }`}>{score.score}</span>
              <span className={`text-xs font-bold px-1 rounded ${
                score.grade === "A" ? "text-emerald-600" :
                score.grade === "B" ? "text-blue-600" :
                score.grade === "C" ? "text-amber-600" : "text-red-600"
              }`}>{score.grade}</span>
            </div>
          )}
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-foreground/8 transition-colors disabled:opacity-50"
            title="Refresh recommendations"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl bg-foreground/5 animate-pulse" />
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="py-8 text-center">
            <Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Connect platforms and create campaigns to get AI recommendations</p>
          </div>
        ) : (
          <>
            {visibleRecs.map((rec, i) => {
              const cfg = TYPE_CONFIG[rec.type] ?? TYPE_CONFIG.info;
              const TypeIcon = cfg.icon;
              const CatIcon = CATEGORY_ICONS[rec.category] ?? Target;
              return (
                <div
                  key={rec.id ?? i}
                  className={`rounded-xl border p-4 transition-all hover:shadow-sm ${cfg.bg}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                      <TypeIcon className={`w-4 h-4 ${cfg.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="text-sm font-semibold text-foreground leading-tight">{rec.title}</h4>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[rec.priority]}`}>
                          {rec.priority}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cfg.badge} flex items-center gap-1`}>
                          <CatIcon className="w-2.5 h-2.5" />
                          {rec.category}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-2">{rec.description}</p>
                      {rec.metric && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[11px] text-muted-foreground">{rec.metric.label}:</span>
                          <span className="text-[11px] font-semibold text-foreground">{rec.metric.value}</span>
                          {rec.metric.change && (
                            <span className={`text-[10px] font-medium ${
                              rec.metric.trend === "up" ? "text-emerald-600" :
                              rec.metric.trend === "down" ? "text-red-600" : "text-muted-foreground"
                            }`}>{rec.metric.change}</span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground italic">{rec.impact}</span>
                        {rec.actionUrl && (
                          <button
                            onClick={() => handleAction(rec)}
                            className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                          >
                            {rec.action}
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {recommendations.length > 3 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? (
                  <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
                ) : (
                  <><ChevronDown className="w-3.5 h-3.5" /> Show {recommendations.length - 3} more recommendations</>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {data?.generatedAt && (
        <div className="px-5 py-2.5 border-t border-border/40 bg-foreground/2">
          <p className="text-[10px] text-muted-foreground">
            Last updated: {new Date(data.generatedAt).toLocaleTimeString()} · {data.dataPoints?.campaigns ?? 0} campaigns analyzed
          </p>
        </div>
      )}
    </div>
  );
}
