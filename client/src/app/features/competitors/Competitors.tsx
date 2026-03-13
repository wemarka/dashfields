// Competitors.tsx
// Competitor Analysis page — compare your performance vs industry benchmarks.
import { useState } from "react";
import { trpc } from "@/core/lib/trpc";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
  LineChart, Line,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Award, AlertTriangle,
  BarChart2, Target, Zap, ChevronDown, RefreshCw, Sparkles, Loader2,
  Shield, ShieldAlert, Lightbulb, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useState as useLocalState } from "react";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { Streamdown } from "streamdown";

// ─── Types ────────────────────────────────────────────────────────────────────
type DatePreset = "last_7d" | "last_30d" | "this_month" | "last_month";

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "last_7d",    label: "Last 7 Days" },
  { value: "last_30d",   label: "Last 30 Days" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
];

// ─── Delta Badge ──────────────────────────────────────────────────────────────
function DeltaBadge({ delta, lowerIsBetter = false }: { delta: number | null; lowerIsBetter?: boolean }) {
  if (delta === null) return <span className="text-xs text-muted-foreground">No data</span>;
  const isPositive = lowerIsBetter ? delta < 0 : delta > 0;
  const isNeutral  = delta === 0;

  if (isNeutral) return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Minus className="w-3 h-3" /> On par
    </span>
  );

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isPositive ? "+" : ""}{delta.toFixed(2)}
    </span>
  );
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const color = score >= 60 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  const label = score >= 60 ? "Outperforming" : score >= 40 ? "On par" : "Underperforming";

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold text-white"
        style={{ background: `conic-gradient(${color} ${score}%, #e5e7eb ${score}%)` }}
      >
        <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
          <span className="text-xs font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
      <span className="text-[10px] font-medium" style={{ color }}>{label}</span>
    </div>
  );
}

// ─── Platform Comparison Card ─────────────────────────────────────────────────
function PlatformCard({
  platform,
  metrics,
  benchmark,
  comparison,
  score,
  hasData,
  campaignCount,
  onSelect,
  isSelected,
}: {
  platform: string;
  metrics: { ctr: number; cpc: number; cpm: number; convRate: number; roas: number; impressions: number; clicks: number; spend: number };
  benchmark: { ctr: number; cpc: number; cpm: number; convRate: number; roas: number };
  comparison: { ctrDelta: number | null; cpcDelta: number | null; cpmDelta: number | null; convRateDelta: number | null; roasDelta: number | null };
  score: number;
  hasData: boolean;
  campaignCount: number;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const rows = [
    { label: "CTR",        yours: `${metrics.ctr}%`,    bench: `${benchmark.ctr}%`,    delta: comparison.ctrDelta,      lowerIsBetter: false },
    { label: "CPC",        yours: `$${metrics.cpc}`,    bench: `$${benchmark.cpc}`,    delta: comparison.cpcDelta,      lowerIsBetter: true  },
    { label: "CPM",        yours: `$${metrics.cpm}`,    bench: `$${benchmark.cpm}`,    delta: comparison.cpmDelta,      lowerIsBetter: true  },
    { label: "Conv. Rate", yours: `${metrics.convRate}%`, bench: `${benchmark.convRate}%`, delta: comparison.convRateDelta, lowerIsBetter: false },
    { label: "ROAS",       yours: `${metrics.roas}x`,   bench: `${benchmark.roas}x`,   delta: comparison.roasDelta,     lowerIsBetter: false },
  ];

  return (
    <div
      onClick={onSelect}
      className={`bg-card border rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "border-primary ring-2 ring-primary/20" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <PlatformIcon platform={platform} className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground capitalize">{platform}</h3>
            <p className="text-xs text-muted-foreground">{campaignCount} campaign{campaignCount !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <ScoreRing score={score} />
      </div>

      {!hasData ? (
        <div className="text-center py-4 text-xs text-muted-foreground">
          No metrics data for this period
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground w-20">{row.label}</span>
              <span className="font-medium text-foreground">{row.yours}</span>
              <span className="text-muted-foreground">vs {row.bench}</span>
              <DeltaBadge delta={row.delta} lowerIsBetter={row.lowerIsBetter} />
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-xs font-semibold text-foreground">{metrics.impressions.toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground">Impressions</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-foreground">{metrics.clicks.toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground">Clicks</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-foreground">${metrics.spend.toFixed(2)}</div>
          <div className="text-[10px] text-muted-foreground">Spend</div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Competitors() {
  usePageTitle("Competitors");
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [aiStrategy, setAiStrategy] = useLocalState<string | null>(null);
  const [showStrategy, setShowStrategy] = useLocalState(false);
  const [swotData, setSwotData] = useLocalState<{
    strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[];
    recommendations: string[]; competitiveScore: number; summary: string;
  } | null>(null);
  const [showSwot, setShowSwot] = useLocalState(false);
  const [swotCompetitor, setSwotCompetitor] = useLocalState("Industry Average");

  const generateSwot = trpc.ai.competitorSwot.useMutation({
    onSuccess: (data) => { setSwotData(data); setShowSwot(true); },
    onError: (err) => toast.error("SWOT failed: " + err.message),
  });

  const generateStrategy = trpc.ai.generate.useMutation({
    onSuccess: (data) => {
      const text = typeof data.content === "string" ? data.content : "Strategy generated.";
      setAiStrategy(text);
      setShowStrategy(true);
    },
    onError: (err) => toast.error("AI error: " + err.message),
  });

  const { data: comparison, isLoading } = trpc.competitors.benchmarkComparison.useQuery({ datePreset });
  const { data: trendData, isLoading: trendLoading } = trpc.competitors.platformTrend.useQuery(
    { platform: selectedPlatform ?? "", datePreset },
    { enabled: !!selectedPlatform }
  );
  const { data: benchmarks } = trpc.competitors.getBenchmarks.useQuery();

  const platforms = comparison?.platforms ?? [];
  const summary   = comparison?.summary;

  // Radar chart data for selected platform
  const radarData = selectedPlatform && platforms.length > 0 ? (() => {
    const p = platforms.find(pl => pl.platform === selectedPlatform);
    if (!p || !p.hasData) return [];
    return [
      { metric: "CTR",       yours: Math.min((p.metrics.ctr / p.benchmark.ctr) * 100, 200),   benchmark: 100 },
      { metric: "CPC Eff",   yours: Math.min((p.benchmark.cpc / Math.max(p.metrics.cpc, 0.01)) * 100, 200), benchmark: 100 },
      { metric: "CPM Eff",   yours: Math.min((p.benchmark.cpm / Math.max(p.metrics.cpm, 0.01)) * 100, 200), benchmark: 100 },
      { metric: "Conv Rate", yours: Math.min((p.metrics.convRate / p.benchmark.convRate) * 100, 200), benchmark: 100 },
      { metric: "ROAS",      yours: Math.min((p.metrics.roas / p.benchmark.roas) * 100, 200),   benchmark: 100 },
    ];
  })() : [];

  // Bar chart for benchmark comparison
  const barData = benchmarks?.map((b) => {
    const myPlatform = platforms.find(p => p.platform === b.platform);
    return {
      platform: b.platform,
      yourCtr:  myPlatform?.metrics.ctr ?? 0,
      benchCtr: b.avgCtr,
    };
  }).filter(d => d.yourCtr > 0) ?? [];

  return (
    <>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">Competitor Analysis</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Compare your performance against industry benchmarks
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* SWOT Competitor Input */}
            <input
              type="text" value={swotCompetitor} onChange={(e) => setSwotCompetitor(e.target.value)}
              placeholder="Competitor name..."
              className="px-3 py-1.5 rounded-xl text-xs border border-border bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 w-36"
            />
            <button
              onClick={() => {
                const myPlatform = platforms.find(p => p.hasData);
                generateSwot.mutate({
                  yourBrand: "Your Brand",
                  competitorName: swotCompetitor || "Industry Average",
                  industry: "digital marketing",
                  yourMetrics: {
                    ctr: myPlatform?.metrics.ctr ?? 0,
                    cpc: myPlatform?.metrics.cpc ?? 0,
                    roas: myPlatform?.metrics.roas ?? 0,
                    engagementRate: 0,
                  },
                  industryAvgMetrics: {
                    ctr: myPlatform?.benchmark.ctr ?? 2.0,
                    cpc: myPlatform?.benchmark.cpc ?? 1.5,
                    roas: myPlatform?.benchmark.roas ?? 3.0,
                    engagementRate: 3.5,
                  },
                });
              }}
              disabled={generateSwot.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            >
              {generateSwot.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
              SWOT
            </button>
            {DATE_PRESETS.map((d) => (
              <button
                key={d.value}
                onClick={() => setDatePreset(d.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  datePreset === d.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted text-muted-foreground hover:border-primary/50"
                }`}
              >
                {d.label}
              </button>
            ))}
            <button
              onClick={() => {
                const summaryText = summary
                  ? `Platforms: ${summary.totalPlatforms}, Outperforming: ${summary.outperforming}, Underperforming: ${summary.underperforming}, Avg Score: ${summary.avgScore}%`
                  : "No data yet";
                generateStrategy.mutate({
                  tool: "strategy",
                  prompt: `Based on these benchmark comparison results: ${summaryText}. Provide 3-5 actionable recommendations to improve ad performance.`,
                });
              }}
              disabled={generateStrategy.isPending || !summary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs font-medium text-violet-600 hover:bg-violet-500/20 transition-colors disabled:opacity-50"
            >
              {generateStrategy.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              AI Strategy
            </button>
          </div>
        </div>

            {/* SWOT Analysis Panel */}
            {showSwot && swotData && (
              <div className="rounded-2xl border border-border bg-card p-5 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> SWOT Analysis vs {swotCompetitor}</p>
                  <button onClick={() => setShowSwot(false)} className="text-xs text-muted-foreground hover:text-foreground">Close ×</button>
                </div>
                {/* Competitive Score */}
                <div className="flex items-center gap-4 mb-4 p-3 bg-muted/50 rounded-xl">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ background: `conic-gradient(${swotData.competitiveScore >= 60 ? '#10b981' : swotData.competitiveScore >= 40 ? '#f59e0b' : '#ef4444'} ${swotData.competitiveScore}%, #e5e7eb ${swotData.competitiveScore}%)` }}>
                    <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
                      <span className="text-xs font-bold">{swotData.competitiveScore}</span>
                    </div>
                  </div>
                  <p className="text-sm text-foreground">{swotData.summary}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { title: "Strengths",     items: swotData.strengths,     color: "border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-800", titleColor: "text-emerald-700 dark:text-emerald-400", icon: "💪" },
                    { title: "Weaknesses",    items: swotData.weaknesses,    color: "border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800",             titleColor: "text-red-700 dark:text-red-400",     icon: "⚠️" },
                    { title: "Opportunities", items: swotData.opportunities, color: "border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800",         titleColor: "text-blue-700 dark:text-blue-400",   icon: "🚀" },
                    { title: "Threats",       items: swotData.threats,       color: "border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800",     titleColor: "text-amber-700 dark:text-amber-400", icon: "🔴" },
                  ].map((q) => (
                    <div key={q.title} className={`border rounded-xl p-3 ${q.color}`}>
                      <p className={`text-xs font-bold mb-2 ${q.titleColor}`}>{q.icon} {q.title}</p>
                      <ul className="space-y-1">
                        {q.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                            <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />{item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                {swotData.recommendations.length > 0 && (
                  <div className="border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/10 rounded-xl p-3">
                    <p className="text-xs font-bold text-violet-700 dark:text-violet-400 mb-2">💡 Strategic Recommendations</p>
                    <ul className="space-y-1">
                      {swotData.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                          <span className="text-violet-500 font-bold shrink-0">{i + 1}.</span>{r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* AI Strategy Panel */}
            {showStrategy && aiStrategy && (
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 mb-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-violet-700 flex items-center gap-2"><Sparkles className="w-4 h-4" /> AI Strategy Recommendations</p>
              <button onClick={() => setShowStrategy(false)} className="text-xs text-muted-foreground hover:text-foreground">Close ×</button>
            </div>
            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{aiStrategy}</div>
          </div>
        )}

        {/* Summary KPIs */}
        {summary && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: "Platforms Tracked",  value: summary.totalPlatforms, icon: BarChart2, color: "text-blue-500 bg-blue-500/10" },
              { label: "Outperforming",       value: summary.outperforming,  icon: Award,    color: "text-emerald-500 bg-emerald-500/10" },
              { label: "Underperforming",     value: summary.underperforming, icon: AlertTriangle, color: "text-red-500 bg-red-500/10" },
              { label: "Avg. Score",          value: `${summary.avgScore ?? 0}%`, icon: Target, color: "text-violet-500 bg-violet-500/10" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse h-64" />
            ))}
          </div>
        ) : platforms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
              <BarChart2 className="w-8 h-8 text-violet-400" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">No campaigns yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Create campaigns and add metrics data to see how you compare against industry benchmarks.
            </p>
          </div>
        ) : (
          <>
            {/* Platform Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {platforms.map((p) => (
                <PlatformCard
                  key={p.platform}
                  platform={p.platform}
                  metrics={p.metrics}
                  benchmark={p.benchmark}
                  comparison={p.comparison}
                  score={p.score}
                  hasData={p.hasData}
                  campaignCount={p.campaignCount}
                  onSelect={() => setSelectedPlatform(prev => prev === p.platform ? null : p.platform)}
                  isSelected={selectedPlatform === p.platform}
                />
              ))}
            </div>

            {/* CTR Comparison Bar Chart */}
            {barData.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5 mb-6">
                <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-primary" />
                  CTR: Your Performance vs Industry Average
                </h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="platform" tick={{ fontSize: 11 }} tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
                    <Legend />
                    <Bar dataKey="yourCtr"  name="Your CTR"       fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="benchCtr" name="Industry Avg"   fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Selected Platform Deep Dive */}
            {selectedPlatform && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Radar Chart */}
                {radarData.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl p-5">
                    <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      Performance Radar — {selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}
                    </h2>
                    <p className="text-xs text-muted-foreground mb-3">
                      100 = industry benchmark. Higher is better for all metrics.
                    </p>
                    <ResponsiveContainer width="100%" height={260}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="var(--border)" />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 200]} tick={{ fontSize: 9 }} />
                        <Radar name="Your Performance" dataKey="yours"     fill="#6366f1" fillOpacity={0.3} stroke="#6366f1" />
                        <Radar name="Industry Avg"     dataKey="benchmark" fill="#e2e8f0" fillOpacity={0.2} stroke="#94a3b8" strokeDasharray="4 4" />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Trend Chart */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    CTR Trend vs Benchmark — {selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}
                  </h2>
                  {trendLoading ? (
                    <div className="h-60 bg-muted animate-pulse rounded-xl" />
                  ) : !trendData?.trend.length ? (
                    <div className="h-60 flex items-center justify-center text-sm text-muted-foreground">
                      No daily data available for this period
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={trendData.trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                        <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
                        <Legend />
                        <Line type="monotone" dataKey="yourCtr"      name="Your CTR"     stroke="#6366f1" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="benchmarkCtr" name="Industry Avg" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}

            {/* Industry Benchmarks Table */}
            <div className="bg-card border border-border rounded-2xl p-5 mt-6">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Industry Benchmarks Reference (2024 Averages)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {["Platform", "Avg CTR", "Avg CPC", "Avg CPM", "Conv. Rate", "ROAS"].map((h) => (
                        <th key={h} className="text-left py-2 px-3 font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(benchmarks ?? []).map((b) => (
                      <tr key={b.platform} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <PlatformIcon platform={b.platform} className="w-4 h-4" />
                            <span className="font-medium text-foreground capitalize">{b.platform}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-foreground">{b.avgCtr}%</td>
                        <td className="py-2.5 px-3 text-foreground">${b.avgCpc}</td>
                        <td className="py-2.5 px-3 text-foreground">${b.avgCpm}</td>
                        <td className="py-2.5 px-3 text-foreground">{b.avgConversionRate}%</td>
                        <td className="py-2.5 px-3 text-foreground">{b.avgRoas}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3">
                Sources: WordStream, HubSpot, Databox industry reports (2024). Benchmarks vary by industry and audience.
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
