/**
 * drawer/AdSetsTab.tsx — Ad set cards with budget pacing, targeting, and metrics.
 */
import { useState } from "react";
import { Badge } from "@/core/components/ui/badge";
import {
  Loader2, Layers, Target, Globe, MapPin,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { AdSetInfo, AdSetInsightInfo, STATUS_CONFIG, fmtNum, fmtPct } from "./types";

// ─── Ad Set Card ────────────────────────────────────────────────────────────
function AdSetCard({ adset, insight, fmtCurrency }: {
  adset: AdSetInfo; insight?: AdSetInsightInfo;
  fmtCurrency: (n: number) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_CONFIG[adset.status?.toLowerCase()] ?? STATUS_CONFIG.draft;
  const genderLabels = (adset.targeting?.genders ?? []).map(g => g === 1 ? "Male" : g === 2 ? "Female" : "All");
  const platforms = Array.from(new Set(adset.targeting?.publisherPlatforms ?? []));
  const positions = Array.from(new Set([
    ...(adset.targeting?.facebookPositions ?? []),
    ...(adset.targeting?.instagramPositions ?? []),
  ]));

  // Budget pacing
  const budget = adset.dailyBudget ?? adset.lifetimeBudget ?? 0;
  const spent = insight?.spend ?? 0;
  const pacingPct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const pacingColor = pacingPct > 90 ? "bg-red-500" : pacingPct > 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-border/80">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Layers className="w-3.5 h-3.5 text-primary/60" />
            <span className="text-sm font-medium text-foreground truncate">{adset.name}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.bg} ${statusCfg.text}`}>
              <span className={`w-1 h-1 rounded-full ${statusCfg.dot}`} />
              {statusCfg.label}
            </span>
            {budget > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {adset.dailyBudget != null ? `${fmtCurrency(adset.dailyBudget)}/day` : `${fmtCurrency(adset.lifetimeBudget!)} lifetime`}
              </span>
            )}
          </div>
        </div>
        {insight && (
          <div className="flex items-center gap-4 text-right flex-shrink-0">
            <div>
              <p className="text-[10px] text-muted-foreground">Spend</p>
              <p className="text-sm font-semibold text-foreground">{fmtCurrency(insight.spend)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">CTR</p>
              <p className="text-sm font-semibold text-foreground">{fmtPct(insight.ctr)}</p>
            </div>
          </div>
        )}
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-4 animate-fade-in">
          {/* Budget Pacing */}
          {budget > 0 && insight && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-medium text-muted-foreground">Budget Pacing</span>
                <span className="text-[10px] font-mono text-muted-foreground">{fmtCurrency(spent)} / {fmtCurrency(budget)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${pacingColor} transition-all duration-700`} style={{ width: `${pacingPct}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{pacingPct.toFixed(0)}% utilized</p>
            </div>
          )}

          {/* Performance Grid */}
          {insight && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Impressions", value: fmtNum(insight.impressions) },
                { label: "Reach", value: fmtNum(insight.reach) },
                { label: "CPC", value: fmtCurrency(insight.cpc) },
                { label: "CPM", value: fmtCurrency(insight.cpm) },
              ].map(m => (
                <div key={m.label} className="text-center p-2 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{m.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Targeting */}
          {adset.targeting && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Targeting
              </p>
              <div className="flex flex-wrap gap-1.5">
                {adset.targeting.ageMin != null && adset.targeting.ageMax != null && (
                  <Badge variant="secondary" className="text-[10px]">Age: {adset.targeting.ageMin}–{adset.targeting.ageMax}</Badge>
                )}
                {genderLabels.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">{genderLabels.join(", ")}</Badge>
                )}
                {adset.targeting.countries.map(c => (
                  <Badge key={c} variant="secondary" className="text-[10px]"><Globe className="w-2.5 h-2.5 mr-0.5" /> {c}</Badge>
                ))}
                {adset.targeting.cities.map(c => (
                  <Badge key={c} variant="secondary" className="text-[10px]"><MapPin className="w-2.5 h-2.5 mr-0.5" /> {c}</Badge>
                ))}
                {platforms.map(p => (
                  <Badge key={p} variant="secondary" className="text-[10px] capitalize">{p}</Badge>
                ))}
                {positions.map((p, idx) => (
                  <Badge key={`pos-${p}-${idx}`} variant="outline" className="text-[10px] capitalize">{p.replace(/_/g, " ")}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Optimization */}
          {(adset.optimizationGoal || adset.billingEvent) && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {adset.optimizationGoal && (
                <span>Optimization: <span className="text-foreground font-medium capitalize">{adset.optimizationGoal.replace(/_/g, " ").toLowerCase()}</span></span>
              )}
              {adset.billingEvent && (
                <span>Billing: <span className="text-foreground font-medium capitalize">{adset.billingEvent.replace(/_/g, " ").toLowerCase()}</span></span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Ad Sets Tab Content ────────────────────────────────────────────────────
interface AdSetsTabProps {
  adSetsData: { adSets: AdSetInfo[]; insights: AdSetInsightInfo[] } | undefined;
  isLoading: boolean;
  fmtCurrency: (n: number) => string;
}

export function AdSetsTab({ adSetsData, isLoading, fmtCurrency }: AdSetsTabProps) {
  if (isLoading) {
    return (
      <div className="p-5">
        <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </div>
    );
  }

  if (!adSetsData?.adSets?.length) {
    return (
      <div className="p-5">
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <Layers className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">No ad sets found for this campaign.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-muted-foreground">{adSetsData.adSets.length} ad set{adSetsData.adSets.length !== 1 ? "s" : ""}</p>
      </div>
      <div className="space-y-3">
        {adSetsData.adSets.map(adset => {
          const insight = adSetsData.insights.find(i => i.adsetId === adset.id);
          return <AdSetCard key={adset.id} adset={adset} insight={insight} fmtCurrency={fmtCurrency} />;
        })}
      </div>
    </div>
  );
}
