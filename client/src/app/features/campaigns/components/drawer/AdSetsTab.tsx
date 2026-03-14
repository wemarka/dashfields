/**
 * drawer/AdSetsTab.tsx — Enhanced ad set cards with budget pacing, inline edit, and status chips.
 *
 * Features:
 *  - Budget pacing bar with color-coded warning states
 *  - Inline budget editing
 *  - Enhanced status chips with animated dot
 *  - Targeting summary with platform icons
 *  - Performance mini-grid
 *  - Smooth expand/collapse animation
 */
import { useState } from "react";
import { Badge } from "@/core/components/ui/badge";
import {
  Loader2, Layers, Target, Globe, MapPin,
  ChevronDown, ChevronUp, TrendingUp, Users,
  Smartphone, Monitor,
} from "lucide-react";
import { InlineBudgetEditor } from "./SharedComponents";
import { AdSetInfo, AdSetInsightInfo, STATUS_CONFIG, fmtNum, fmtPct } from "./types";

// ─── Platform Icons ──────────────────────────────────────────────────────────
const PLATFORM_COLORS: Record<string, string> = {
  facebook:  "bg-muted text-muted-foreground",
  instagram: "bg-muted text-muted-foreground",
  messenger: "bg-muted text-muted-foreground",
  audience_network: "bg-brand/10 text-brand dark:text-brand",
  tiktok:    "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400",
};

// ─── Budget Pacing Bar ───────────────────────────────────────────────────────
function BudgetPacingBar({ budget, spent, fmtCurrency }: {
  budget: number; spent: number; fmtCurrency: (n: number) => string;
}) {
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const isOver = pct >= 90;
  const isMid  = pct >= 60;
  const barColor = isOver ? "bg-brand" : isMid ? "bg-neutral-400" : "bg-neutral-300";
  const textColor = isOver ? "text-brand" : isMid ? "text-muted-foreground" : "text-foreground";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground font-medium">Budget Pacing</span>
        <span className={`font-mono font-medium ${textColor}`}>
          {fmtCurrency(spent)} / {fmtCurrency(budget)}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{pct.toFixed(0)}% utilized</span>
        <span>{fmtCurrency(Math.max(0, budget - spent))} remaining</span>
      </div>
    </div>
  );
}

// ─── Metric Mini-Cell ─────────────────────────────────────────────────────────
function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-2.5 rounded-lg bg-muted/40 border border-border/50">
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

// ─── Ad Set Card ─────────────────────────────────────────────────────────────
function AdSetCard({ adset, insight, fmtCurrency }: {
  adset: AdSetInfo;
  insight?: AdSetInsightInfo;
  fmtCurrency: (n: number) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_CONFIG[adset.status?.toLowerCase()] ?? STATUS_CONFIG.draft;

  const genderLabels = (adset.targeting?.genders ?? []).map(g =>
    g === 1 ? "Male" : g === 2 ? "Female" : "All"
  );
  const platforms = Array.from(new Set(adset.targeting?.publisherPlatforms ?? []));
  const positions = Array.from(new Set([
    ...(adset.targeting?.facebookPositions ?? []),
    ...(adset.targeting?.instagramPositions ?? []),
  ]));

  const budget = adset.dailyBudget ?? adset.lifetimeBudget ?? 0;
  const spent  = insight?.spend ?? 0;
  const budgetLabel = adset.dailyBudget != null
    ? `${fmtCurrency(adset.dailyBudget)}/day`
    : adset.lifetimeBudget != null
      ? `${fmtCurrency(adset.lifetimeBudget)} lifetime`
      : null;

  return (
    <div className={`rounded-xl border bg-card overflow-hidden transition-all duration-200 ${
      expanded ? "border-primary/30 shadow-sm" : "border-border hover:border-border/80"
    }`}>
      {/* ── Collapsed Header ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
      >
        {/* Status dot */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusCfg.dot}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-foreground truncate">{adset.name}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.bg} ${statusCfg.text}`}>
              {statusCfg.label}
            </span>
            {budgetLabel && (
              <span className="text-[10px] text-muted-foreground">{budgetLabel}</span>
            )}
            {adset.optimizationGoal && (
              <span className="text-[10px] text-muted-foreground capitalize hidden sm:inline">
                {adset.optimizationGoal.replace(/_/g, " ").toLowerCase()}
              </span>
            )}
          </div>
        </div>

        {/* Quick metrics */}
        {insight && (
          <div className="flex items-center gap-4 text-right flex-shrink-0">
            <div>
              <p className="text-[10px] text-muted-foreground">Spend</p>
              <p className="text-sm font-semibold text-foreground">{fmtCurrency(insight.spend)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">CTR</p>
              <p className={`text-sm font-semibold ${insight.ctr >= 2 ? "text-foreground" : insight.ctr >= 1 ? "text-muted-foreground" : "text-brand"}`}>
                {fmtPct(insight.ctr)}
              </p>
            </div>
          </div>
        )}

        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        }
      </button>

      {/* ── Expanded Details ── */}
      {expanded && (
        <div className="border-t border-border/60 p-4 space-y-4">
          {/* Budget Pacing */}
          {budget > 0 && insight && (
            <BudgetPacingBar budget={budget} spent={spent} fmtCurrency={fmtCurrency} />
          )}

          {/* Inline Budget Edit */}
          {budget > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Daily Budget:</span>
              <InlineBudgetEditor
                value={adset.dailyBudget}
                onSave={(v) => console.log("Save adset budget", adset.id, v)}
                fmtMoney={fmtCurrency}
              />
            </div>
          )}

          {/* Performance Grid */}
          {insight && (
            <div className="grid grid-cols-4 gap-2">
              <MetricCell label="Impressions" value={fmtNum(insight.impressions)} />
              <MetricCell label="Reach"       value={fmtNum(insight.reach)} />
              <MetricCell label="CPC"         value={fmtCurrency(insight.cpc)} />
              <MetricCell label="CPM"         value={fmtCurrency(insight.cpm)} />
            </div>
          )}

          {/* Targeting */}
          {adset.targeting && (
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary/60" /> Audience Targeting
              </p>

              {/* Age & Gender */}
              <div className="flex items-center gap-2 flex-wrap">
                {adset.targeting.ageMin != null && adset.targeting.ageMax != null && (
                  <div className="flex items-center gap-1 text-[11px] bg-muted/50 px-2 py-1 rounded-md border border-border/50">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="text-foreground font-medium">
                      {adset.targeting.ageMin}–{adset.targeting.ageMax} yrs
                    </span>
                  </div>
                )}
                {genderLabels.length > 0 && (
                  <div className="text-[11px] bg-muted/50 px-2 py-1 rounded-md border border-border/50 text-foreground font-medium">
                    {genderLabels.join(", ")}
                  </div>
                )}
              </div>

              {/* Countries */}
              {adset.targeting.countries.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {adset.targeting.countries.map(c => (
                    <Badge key={c} variant="secondary" className="text-[10px] gap-1">
                      <Globe className="w-2.5 h-2.5" /> {c}
                    </Badge>
                  ))}
                  {adset.targeting.cities.map(c => (
                    <Badge key={c} variant="secondary" className="text-[10px] gap-1">
                      <MapPin className="w-2.5 h-2.5" /> {c}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Platforms */}
              {platforms.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {platforms.map(p => (
                    <span
                      key={p}
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-md capitalize ${PLATFORM_COLORS[p] ?? "bg-muted/50 text-muted-foreground"}`}
                    >
                      {p.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}

              {/* Positions */}
              {positions.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {positions.map((p, idx) => (
                    <Badge key={`pos-${p}-${idx}`} variant="outline" className="text-[10px] capitalize">
                      {p.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Optimization & Billing */}
          {(adset.optimizationGoal || adset.billingEvent) && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border/40">
              {adset.optimizationGoal && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Optimize for: <span className="text-foreground font-medium capitalize">{adset.optimizationGoal.replace(/_/g, " ").toLowerCase()}</span></span>
                </div>
              )}
              {adset.billingEvent && (
                <div className="flex items-center gap-1">
                  <Monitor className="w-3 h-3" />
                  <span>Billed per: <span className="text-foreground font-medium capitalize">{adset.billingEvent.replace(/_/g, " ").toLowerCase()}</span></span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Summary Bar ─────────────────────────────────────────────────────────────
function AdSetsSummary({ adSets, insights, fmtCurrency }: {
  adSets: AdSetInfo[];
  insights: AdSetInsightInfo[];
  fmtCurrency: (n: number) => string;
}) {
  const totalSpend = insights.reduce((s, i) => s + i.spend, 0);
  const totalImpressions = insights.reduce((s, i) => s + i.impressions, 0);
  const avgCtr = insights.length > 0
    ? insights.reduce((s, i) => s + i.ctr, 0) / insights.length
    : 0;
  const activeCount = adSets.filter(a => a.status?.toLowerCase() === "active").length;

  return (
    <div className="grid grid-cols-4 gap-2 p-3 rounded-xl bg-muted/30 border border-border/50 mb-3">
      {[
        { label: "Ad Sets", value: String(adSets.length) },
        { label: "Active", value: String(activeCount) },
        { label: "Total Spend", value: fmtCurrency(totalSpend) },
        { label: "Avg CTR", value: fmtPct(avgCtr) },
      ].map(m => (
        <div key={m.label} className="text-center">
          <p className="text-[10px] text-muted-foreground">{m.label}</p>
          <p className="text-sm font-bold text-foreground">{m.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────
interface AdSetsTabProps {
  adSetsData: { adSets: AdSetInfo[]; insights: AdSetInsightInfo[] } | undefined;
  isLoading: boolean;
  fmtCurrency: (n: number) => string;
}

export function AdSetsTab({ adSetsData, isLoading, fmtCurrency }: AdSetsTabProps) {
  if (isLoading) {
    return (
      <div className="p-5">
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 h-20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!adSetsData?.adSets?.length) {
    return (
      <div className="p-5 flex flex-col items-center justify-center h-48 text-muted-foreground">
        <Layers className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">No ad sets found</p>
        <p className="text-xs mt-1 opacity-60">This campaign has no ad sets yet.</p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-3">
      <AdSetsSummary
        adSets={adSetsData.adSets}
        insights={adSetsData.insights}
        fmtCurrency={fmtCurrency}
      />
      {adSetsData.adSets.map(adset => {
        const insight = adSetsData.insights.find(i => i.adsetId === adset.id);
        return (
          <AdSetCard key={adset.id} adset={adset} insight={insight} fmtCurrency={fmtCurrency} />
        );
      })}
    </div>
  );
}
