/**
 * client/src/features/ads-analyzer/AdsAnalyzer.tsx
 * AI-powered Meta Ads campaign analyzer with performance scoring and LLM recommendations.
 */
import { useState } from "react";
import { trpc } from "@/core/lib/trpc";
import { useActiveAccount } from "@/core/contexts/ActiveAccountContext";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { Button } from "@/core/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { Separator } from "@/core/components/ui/separator";
import { Progress } from "@/core/components/ui/progress";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { toast } from "sonner";
import {
  Brain, Zap, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, DollarSign, MousePointerClick, Eye, Target,
  Sparkles, RefreshCw, BarChart3, Trophy, ArrowUpRight, ArrowDownRight,
  Minus, ChevronRight, Info
} from "lucide-react";
import { Streamdown } from "streamdown";

// ─── Grade Config ──────────────────────────────────────────────────────────────
const GRADE_CONFIG = {
  A: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800", label: "Excellent" },
  B: { color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-900/20",    border: "border-blue-200 dark:border-blue-800",    label: "Good" },
  C: { color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-amber-900/20",  border: "border-amber-200 dark:border-amber-800",  label: "Average" },
  D: { color: "text-orange-600 dark:text-orange-400",bg: "bg-orange-50 dark:bg-orange-900/20",border: "border-orange-200 dark:border-orange-800",label: "Below Avg" },
  F: { color: "text-red-600 dark:text-red-400",      bg: "bg-red-50 dark:bg-red-900/20",      border: "border-red-200 dark:border-red-800",      label: "Poor" },
};

// ─── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, grade, size = 80 }: { score: number; grade: string; size?: number }) {
  const cfg = GRADE_CONFIG[grade as keyof typeof GRADE_CONFIG] ?? GRADE_CONFIG.C;
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={6} className="stroke-muted" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={6}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          className={score >= 70 ? "stroke-emerald-500" : score >= 50 ? "stroke-amber-500" : "stroke-red-500"}
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className={`font-bold ${size >= 80 ? "text-xl" : "text-sm"} ${cfg.color}`}>{score}</div>
        <div className={`font-bold ${size >= 80 ? "text-base" : "text-xs"} ${cfg.color}`}>{grade}</div>
      </div>
    </div>
  );
}

// ─── Metric Chip ──────────────────────────────────────────────────────────────
function MetricChip({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60">
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold">{value}</span>
    </div>
  );
}

// ─── Campaign Row ─────────────────────────────────────────────────────────────
function CampaignRow({ campaign, rank }: { campaign: any; rank: number }) {
  const cfg = GRADE_CONFIG[campaign.grade as keyof typeof GRADE_CONFIG] ?? GRADE_CONFIG.C;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden transition-all`}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Rank */}
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
          {rank === 1 ? <Trophy className="w-3 h-3 text-amber-500" /> : rank}
        </div>

        {/* Score ring */}
        <ScoreRing score={campaign.score} grade={campaign.grade} size={44} />

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{campaign.campaignName}</p>
          <p className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</p>
        </div>

        {/* Quick metrics */}
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <MetricChip label="Spend" value={`$${campaign.spend.toFixed(0)}`} icon={DollarSign} color="text-blue-500" />
          <MetricChip label="CTR" value={`${campaign.ctr.toFixed(2)}%`} icon={MousePointerClick} color="text-violet-500" />
          <MetricChip label="ROAS" value={`${campaign.roas.toFixed(1)}x`} icon={TrendingUp} color="text-emerald-500" />
        </div>

        <ChevronRight className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-current/10 pt-3">
          {[
            { label: "Spend", value: `$${campaign.spend.toFixed(2)}`, icon: DollarSign, color: "text-blue-500" },
            { label: "Impressions", value: campaign.impressions.toLocaleString(), icon: Eye, color: "text-slate-500" },
            { label: "Clicks (all)", value: campaign.clicks.toLocaleString(), icon: MousePointerClick, color: "text-violet-500" },
            { label: "CTR", value: `${campaign.ctr.toFixed(2)}%`, icon: Target, color: "text-indigo-500" },
            { label: "CPC", value: `$${campaign.cpc.toFixed(2)}`, icon: DollarSign, color: "text-amber-500" },
            { label: "CPM", value: `$${campaign.cpm.toFixed(2)}`, icon: BarChart3, color: "text-orange-500" },
            { label: "Reach", value: campaign.reach.toLocaleString(), icon: Eye, color: "text-teal-500" },
            { label: "ROAS", value: `${campaign.roas.toFixed(2)}x`, icon: TrendingUp, color: "text-emerald-500" },
          ].map(m => (
            <div key={m.label} className="flex flex-col gap-0.5 p-2 rounded-lg bg-background/60">
              <div className="flex items-center gap-1.5">
                <m.icon className={`w-3 h-3 ${m.color}`} />
                <span className="text-xs text-muted-foreground">{m.label}</span>
              </div>
              <span className="text-sm font-bold">{m.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdsAnalyzer() {
  usePageTitle("AI Ads Analyzer");
  const { activeAccountId } = useActiveAccount();
  const { activeWorkspaceId: workspaceId } = useWorkspace();
  const [datePreset, setDatePreset] = useState("last_30d");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeMutation = trpc.adsAnalyzer.analyze.useMutation({
    onSuccess: (data) => {
      setAnalysisResult(data);
      setIsAnalyzing(false);
      toast.success("Analysis complete!");
    },
    onError: (err) => {
      setIsAnalyzing(false);
      toast.error(err.message || "Failed to analyze campaigns");
    },
  });

  const handleAnalyze = () => {
    if (!activeAccountId) {
      toast.error("Please connect a Meta Ads account first");
      return;
    }
    setIsAnalyzing(true);
    analyzeMutation.mutate({
      accountId: activeAccountId,
      workspaceId: workspaceId ?? undefined,
      datePreset,
    });
  };

  const { campaigns = [], summary, aiAnalysis } = analysisResult ?? {};

  // Grade distribution
  const gradeCount = campaigns.reduce((acc: Record<string, number>, c: any) => {
    acc[c.grade] = (acc[c.grade] ?? 0) + 1;
    return acc;
  }, {});

  return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="w-6 h-6 text-violet-500" />
              AI Ads Analyzer
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Deep campaign analysis powered by AI — get actionable recommendations instantly
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={datePreset} onValueChange={setDatePreset}>
              <SelectTrigger className="w-36 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_7d">Last 7 days</SelectItem>
                <SelectItem value="last_14d">Last 14 days</SelectItem>
                <SelectItem value="last_30d">Last 30 days</SelectItem>
                <SelectItem value="last_90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAnalyze} disabled={isAnalyzing} className="gap-2">
              {isAnalyzing ? (
                <><RefreshCw className="w-4 h-4 animate-spin" />Analyzing...</>
              ) : (
                <><Sparkles className="w-4 h-4" />Analyze Now</>
              )}
            </Button>
          </div>
        </div>

        {/* No account warning */}
        {!activeAccountId && (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">No Meta Ads account connected</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">Connect your Meta Ads account from the Connections page to use AI Analyzer.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {isAnalyzing && (
          <Card>
            <CardContent className="py-12 flex flex-col items-center gap-4">
              <div className="relative">
                <Brain className="w-12 h-12 text-violet-500 animate-pulse" />
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-violet-500 animate-ping" />
              </div>
              <div className="text-center">
                <p className="font-semibold">AI is analyzing your campaigns...</p>
                <p className="text-sm text-muted-foreground mt-1">Fetching data, scoring performance, and generating recommendations</p>
              </div>
              <div className="w-64 space-y-2">
                {["Fetching campaign data", "Calculating performance scores", "Generating AI insights"].map((step, i) => (
                  <div key={step} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-violet-500 animate-pulse" : "bg-muted"}`} />
                    {step}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {analysisResult && !isAnalyzing && (
          <div className="space-y-6">
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Spend", value: `$${(summary?.totalSpend ?? 0).toFixed(2)}`, icon: DollarSign, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
                { label: "Campaigns", value: campaigns.length, icon: BarChart3, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-900/20" },
                { label: "Avg CTR", value: `${(summary?.avgCtr ?? 0).toFixed(2)}%`, icon: MousePointerClick, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
                { label: "Avg ROAS", value: `${(summary?.avgRoas ?? 0).toFixed(2)}x`, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
              ].map(kpi => (
                <Card key={kpi.label} className={`${kpi.bg} border-0`}>
                  <CardContent className="pt-4 pb-3">
                    <div className={`w-8 h-8 rounded-lg bg-white dark:bg-black/20 flex items-center justify-center mb-2`}>
                      <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                    </div>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-xl font-bold">{kpi.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Grade Distribution */}
            {campaigns.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                    Performance Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-3">
                    {(["A", "B", "C", "D", "F"] as const).map(grade => {
                      const count = gradeCount[grade] ?? 0;
                      const pct = campaigns.length > 0 ? (count / campaigns.length) * 100 : 0;
                      const cfg = GRADE_CONFIG[grade];
                      return (
                        <div key={grade} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs text-muted-foreground">{count}</span>
                          <div
                            style={{ height: `${Math.max(4, pct * 1.2)}px` }}
                            className={`w-full rounded-t-md ${cfg.bg} border ${cfg.border}`}
                          />
                          <span className={`text-xs font-bold ${cfg.color}`}>{grade}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Analysis */}
            {aiAnalysis && (
              <Card className="border-violet-200 dark:border-violet-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Brain className="w-4 h-4 text-violet-500" />
                    AI Analysis & Recommendations
                    <Badge variant="secondary" className="ml-auto text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                      Powered by AI
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <Streamdown>{aiAnalysis}</Streamdown>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Campaign Rankings */}
            {campaigns.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Campaign Rankings
                    <span className="text-xs text-muted-foreground font-normal ml-1">— click to expand details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {campaigns.map((campaign: any, i: number) => (
                    <CampaignRow key={campaign.campaignId} campaign={campaign} rank={i + 1} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Empty campaigns */}
            {campaigns.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium">No campaign data found</p>
                  <p className="text-sm text-muted-foreground mt-1">No campaigns with data in the selected period.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Initial state */}
        {!analysisResult && !isAnalyzing && (
          <Card className="border-dashed">
            <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                <Brain className="w-8 h-8 text-violet-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Ready to Analyze</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Click "Analyze Now" to get AI-powered insights, performance scores, and actionable recommendations for all your campaigns.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {["Performance Scoring", "AI Recommendations", "Campaign Rankings", "Spend Analysis"].map(f => (
                  <Badge key={f} variant="secondary" className="text-xs gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    {f}
                  </Badge>
                ))}
              </div>
              <Button onClick={handleAnalyze} disabled={!activeAccountId} className="mt-2 gap-2">
                <Sparkles className="w-4 h-4" />
                Start Analysis
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
  );
}
