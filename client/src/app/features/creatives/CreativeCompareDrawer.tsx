/**
 * CreativeCompareDrawer — Side-by-side A/B comparison of two ad creatives.
 * Shows key metrics with bar chart comparison and winner highlights.
 */
import { useMemo } from "react";
import {
  X,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  MousePointerClick,
  DollarSign,
  BarChart2,
} from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdCreative {
  id: string;
  name: string;
  campaignName: string;
  status: string;
  creativeType: string;
  thumbnailUrl: string | null;
  headline: string;
  isFatigued: boolean;
  fatigueScore: number;
  insights?: {
    impressions: number;
    reach: number;
    clicks: number;
    spend: number;
    ctr: number;
    cpc: number;
    cpm: number;
    frequency: number;
  };
}

interface Props {
  adA: AdCreative;
  adB: AdCreative;
  onClose: () => void;
}

// ─── Metric Row ───────────────────────────────────────────────────────────────
function MetricRow({
  label,
  valA,
  valB,
  format,
  higherIsBetter = true,
}: {
  label: string;
  valA: number;
  valB: number;
  format: (n: number) => string;
  higherIsBetter?: boolean;
}) {
  const max = Math.max(valA, valB, 0.001);
  const pctA = (valA / max) * 100;
  const pctB = (valB / max) * 100;

  const winnerA = higherIsBetter ? valA > valB : valA < valB;
  const winnerB = higherIsBetter ? valB > valA : valB < valA;
  const tied = valA === valB;

  const diff = valB !== 0 ? ((valA - valB) / Math.abs(valB)) * 100 : 0;

  return (
    <div className="py-3 border-b border-border/50 last:border-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        {!tied && (
          <div className="flex items-center gap-1">
            {Math.abs(diff) > 0.5 && (
              <span className={`text-xs font-medium ${winnerA ? "text-emerald-400" : "text-red-400"}`}>
                {winnerA ? "+" : ""}{diff.toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {/* Ad A */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-sm font-semibold ${winnerA ? "text-emerald-400" : "text-foreground"}`}>
              {format(valA)}
            </span>
            {winnerA && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${winnerA ? "bg-primary" : "bg-muted-foreground/40"}`}
              style={{ width: `${pctA}%` }}
            />
          </div>
        </div>
        {/* Ad B */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-sm font-semibold ${winnerB ? "text-emerald-400" : "text-foreground"}`}>
              {format(valB)}
            </span>
            {winnerB && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${winnerB ? "bg-violet-500" : "bg-muted-foreground/40"}`}
              style={{ width: `${pctB}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Creative Header Card ─────────────────────────────────────────────────────
function CreativeHeader({ ad, color }: { ad: AdCreative; color: "primary" | "violet" }) {
  const colorClass = color === "primary" ? "border-primary/50 bg-primary/5" : "border-violet-500/50 bg-violet-500/5";
  const badgeClass = color === "primary" ? "bg-primary/20 text-primary" : "bg-violet-500/20 text-violet-400";

  return (
    <div className={`rounded-xl border p-3 ${colorClass}`}>
      {/* Thumbnail */}
      {ad.thumbnailUrl ? (
        <div className="aspect-video rounded-lg overflow-hidden mb-2 bg-muted">
          <img src={ad.thumbnailUrl} alt={ad.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="aspect-video rounded-lg bg-muted flex items-center justify-center mb-2">
          <BarChart2 className="w-8 h-8 text-muted-foreground/40" />
        </div>
      )}
      <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mb-1.5 ${badgeClass}`}>
        {color === "primary" ? "A" : "B"}
      </div>
      <p className="text-sm font-semibold text-foreground line-clamp-1">{ad.name}</p>
      <p className="text-xs text-muted-foreground truncate">{ad.campaignName}</p>
      <div className="flex items-center gap-1.5 mt-2">
        <Badge variant={ad.status === "ACTIVE" ? "default" : "secondary"} className="text-xs h-5">
          {ad.status}
        </Badge>
        {ad.isFatigued && (
          <Badge variant="outline" className="text-xs h-5 text-amber-400 border-amber-500/30">
            Fatigued
          </Badge>
        )}
      </div>
    </div>
  );
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────
export function CreativeCompareDrawer({ adA, adB, onClose }: Props) {
  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
    : n.toString();

  const fmtMoney = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(2)}`;

  const fmtPct = (n: number) => `${n.toFixed(2)}%`;

  const insA = adA.insights;
  const insB = adB.insights;

  // Determine overall winner
  const scoreA = (insA?.ctr ?? 0) - (insA?.cpc ?? 0) / 10;
  const scoreB = (insB?.ctr ?? 0) - (insB?.cpc ?? 0) / 10;
  const overallWinner = scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-background border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">A/B Creative Comparison</h2>
            {overallWinner && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Creative <span className="font-medium text-emerald-400">{overallWinner}</span> is performing better overall
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4">
          {/* Creative headers */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <CreativeHeader ad={adA} color="primary" />
            <CreativeHeader ad={adB} color="violet" />
          </div>

          {/* Metrics comparison */}
          {insA && insB ? (
            <div className="rounded-xl border border-border bg-card/50 px-4 py-2">
              <MetricRow
                label="CTR"
                valA={insA.ctr}
                valB={insB.ctr}
                format={fmtPct}
                higherIsBetter
              />
              <MetricRow
                label="Impressions"
                valA={insA.impressions}
                valB={insB.impressions}
                format={fmt}
                higherIsBetter
              />
              <MetricRow
                label="Clicks"
                valA={insA.clicks}
                valB={insB.clicks}
                format={fmt}
                higherIsBetter
              />
              <MetricRow
                label="Spend"
                valA={insA.spend}
                valB={insB.spend}
                format={fmtMoney}
                higherIsBetter={false}
              />
              <MetricRow
                label="CPC"
                valA={insA.cpc}
                valB={insB.cpc}
                format={fmtMoney}
                higherIsBetter={false}
              />
              <MetricRow
                label="CPM"
                valA={insA.cpm}
                valB={insB.cpm}
                format={fmtMoney}
                higherIsBetter={false}
              />
              <MetricRow
                label="Reach"
                valA={insA.reach}
                valB={insB.reach}
                format={fmt}
                higherIsBetter
              />
              <MetricRow
                label="Frequency"
                valA={insA.frequency}
                valB={insB.frequency}
                format={(n) => n.toFixed(2)}
                higherIsBetter={false}
              />
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No insights data available for comparison
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/50 flex-shrink-0">
          <Button variant="outline" size="sm" className="w-full" onClick={onClose}>
            Close Comparison
          </Button>
        </div>
      </div>
    </div>
  );
}
