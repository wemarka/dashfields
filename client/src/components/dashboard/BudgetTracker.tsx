// BudgetTracker — shows daily/monthly spend vs budget per platform
// Shows alert badge when spend >= 80% of budget
import { trpc } from "@/core/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import { AlertTriangle, DollarSign, TrendingUp } from "lucide-react";

function SpendBar({ percent, label }: { percent: number; label: string }) {
  const color =
    percent >= 100
      ? "bg-red-500"
      : percent >= 80
      ? "bg-amber-500"
      : percent >= 60
      ? "bg-yellow-400"
      : "bg-emerald-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={
            percent >= 80 ? "font-semibold text-amber-600" : "text-muted-foreground"
          }
        >
          {Math.min(percent, 100)}%
        </span>
      </div>
      <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function BudgetTracker() {
  const { data, isLoading } = trpc.budget.getBudgetStatus.useQuery({});

  if (isLoading) {
    return (
      <Card className="glass animate-pulse">
        <CardContent className="p-5 h-48" />
      </Card>
    );
  }

  if (!data) return null;

  const { totals, platforms } = data;
  const alertPlatforms = platforms.filter(
    (p) => p.isOverDailyThreshold || p.isOverMonthlyThreshold
  );

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            Budget Tracker
          </CardTitle>
          {alertPlatforms.length > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs gap-1">
              <AlertTriangle className="w-3 h-3" />
              {alertPlatforms.length} alert{alertPlatforms.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Totals */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">Daily Spend</p>
            <p className="text-lg font-semibold">
              ${totals.dailySpend.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              of ${totals.dailyBudget.toLocaleString()} budget
            </p>
            <SpendBar percent={totals.dailyPercent} label="" />
          </div>
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">Monthly Spend</p>
            <p className="text-lg font-semibold">
              ${totals.monthlySpend.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              of ${totals.monthlyBudget.toLocaleString()} budget
            </p>
            <SpendBar percent={totals.monthlyPercent} label="" />
          </div>
        </div>

        {/* Per-platform breakdown (top 4) */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">By Platform</p>
          {platforms.slice(0, 4).map((p) => (
            <div key={p.platform} className="flex items-center gap-3">
              <span className="text-xs capitalize w-16 text-muted-foreground truncate">
                {p.platform}
              </span>
              <div className="flex-1 space-y-1">
                <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      p.dailyPercent >= 80
                        ? "bg-amber-500"
                        : p.dailyPercent >= 60
                        ? "bg-yellow-400"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(p.dailyPercent, 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-muted-foreground w-10 text-right">
                {p.dailyPercent}%
              </span>
              {(p.isOverDailyThreshold || p.isOverMonthlyThreshold) && (
                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Alert summary */}
        {alertPlatforms.length > 0 && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
            <p className="text-xs font-medium text-amber-700 mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Budget Alerts
            </p>
            <div className="space-y-1">
              {alertPlatforms.slice(0, 3).map((p) => (
                <p key={p.platform} className="text-xs text-amber-600">
                  <span className="capitalize font-medium">{p.platform}</span>
                  {p.isOverDailyThreshold && ` — Daily at ${p.dailyPercent}%`}
                  {p.isOverMonthlyThreshold && ` — Monthly at ${p.monthlyPercent}%`}
                </p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
