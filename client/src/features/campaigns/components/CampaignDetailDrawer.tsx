// CampaignDetailDrawer.tsx
// Slide-in drawer showing detailed metrics for a Meta Ads campaign.
// Includes KPI cards + daily performance chart.
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/core/components/ui/sheet";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Badge } from "@/core/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { Loader2, TrendingUp, MousePointerClick, DollarSign, Eye } from "lucide-react";
import { trpc } from "@/core/lib/trpc";
import { useCurrency } from "@/core/hooks/useCurrency";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  dailyBudget?: number | null;
  lifetimeBudget?: number | null;
}

interface Props {
  campaign: MetaCampaign | null;
  open: boolean;
  onClose: () => void;
}

type DatePreset = "last_7d" | "last_14d" | "last_30d" | "last_90d";

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className={`rounded-lg p-1.5 ${color}`}>
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase();
  const variant =
    s === "ACTIVE"   ? "default" :
    s === "PAUSED"   ? "secondary" :
    s === "ARCHIVED" ? "outline" : "destructive";
  return <Badge variant={variant} className="text-xs">{status}</Badge>;
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────
export function CampaignDetailDrawer({ campaign, open, onClose }: Props) {
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");
  const { fmt: fmtCurrencyHook } = useCurrency();

  const { data: daily, isLoading } = trpc.meta.campaignDailyInsights.useQuery(
    { campaignId: campaign?.id ?? "", datePreset },
    { enabled: open && !!campaign?.id }
  );

  const { data: insights } = trpc.meta.campaignInsights.useQuery(
    { datePreset, limit: 50 },
    { enabled: open && !!campaign?.id }
  );

  const campaignInsight = insights?.find(i => i.campaignId === campaign?.id);

  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
    n >= 1_000     ? `${(n / 1_000).toFixed(1)}K` :
    n.toLocaleString();

  const fmtCurrency = (n: number) => fmtCurrencyHook(n);
  const fmtPct = (n: number) => `${n.toFixed(2)}%`;

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto border-l border-white/10 bg-background/95 backdrop-blur-xl p-0"
      >
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-bold truncate">
                {campaign?.name ?? "Campaign"}
              </SheetTitle>
              <SheetDescription className="mt-1 flex items-center gap-2 flex-wrap">
                {campaign?.status && <StatusBadge status={campaign.status} />}
                {campaign?.objective && (
                  <span className="text-xs text-muted-foreground">
                    {campaign.objective.replace(/_/g, " ")}
                  </span>
                )}
                {campaign?.dailyBudget && (
                  <span className="text-xs text-muted-foreground">
                    Budget: ${campaign.dailyBudget.toFixed(0)}/day
                  </span>
                )}
              </SheetDescription>
            </div>
          </div>

          {/* Date Preset Tabs */}
          <Tabs value={datePreset} onValueChange={v => setDatePreset(v as DatePreset)} className="mt-3">
            <TabsList className="bg-white/5 border border-white/10 h-8">
              {(["last_7d", "last_14d", "last_30d", "last_90d"] as DatePreset[]).map(p => (
                <TabsTrigger key={p} value={p} className="text-xs h-6 px-3">
                  {p.replace("last_", "").replace("d", "D")}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </SheetHeader>

        <div className="p-6 space-y-6">
          {/* KPI Cards */}
          {campaignInsight ? (
            <div className="grid grid-cols-2 gap-3">
              <KpiCard
                icon={Eye}
                label="Impressions"
                value={fmt(campaignInsight.impressions)}
                sub={`Reach: ${fmt(campaignInsight.reach)}`}
                color="bg-blue-500"
              />
              <KpiCard
                icon={MousePointerClick}
                label="Clicks"
                value={fmt(campaignInsight.clicks)}
                sub={`CTR: ${fmtPct(campaignInsight.ctr)}`}
                color="bg-emerald-500"
              />
              <KpiCard
                icon={DollarSign}
                label="Spend"
                value={fmtCurrency(campaignInsight.spend)}
                sub={`CPC: ${fmtCurrency(campaignInsight.cpc)}`}
                color="bg-violet-500"
              />
              <KpiCard
                icon={TrendingUp}
                label="CPM"
                value={fmtCurrency(campaignInsight.cpm)}
                sub="Cost per 1,000 impressions"
                color="bg-amber-500"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4 h-20 animate-pulse" />
              ))}
            </div>
          )}

          {/* Daily Chart */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Daily Performance</h3>
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : daily && daily.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={daily} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={d => d.slice(5)} // MM-DD
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={v => fmt(v)}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={v => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === "spend") return [`$${value.toFixed(2)}`, "Spend"];
                      if (name === "ctr")   return [`${value.toFixed(2)}%`, "CTR"];
                      return [fmt(value), name.charAt(0).toUpperCase() + name.slice(1)];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="impressions"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    name="Impressions"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="clicks"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    name="Clicks"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="spend"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                    name="Spend"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No daily data available for this period.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
