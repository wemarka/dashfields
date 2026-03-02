/**
 * PerformanceStats.tsx
 * Performance metrics bar chart panel for the Dashboard.
 */

interface StatItem {
  label: string;
  value: string;
  bar: number; // 0–100
}

interface PerformanceStatsProps {
  stats: StatItem[] | null;
}

const EMPTY_STATS = [
  { label: "CTR",       bar: 0 },
  { label: "CPC",       bar: 0 },
  { label: "CPM",       bar: 0 },
  { label: "Frequency", bar: 0 },
];

export function PerformanceStats({ stats }: PerformanceStatsProps) {
  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <h2 className="text-sm font-semibold">Performance</h2>
      {stats
        ? stats.map((stat) => (
            <div key={stat.label} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <span className="text-xs font-semibold">{stat.value}</span>
              </div>
              <div className="h-1.5 bg-foreground/8 rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground/40 rounded-full transition-all duration-500"
                  style={{ width: stat.bar + "%" }}
                />
              </div>
            </div>
          ))
        : EMPTY_STATS.map((stat) => (
            <div key={stat.label} className="space-y-1.5 opacity-40">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <span className="text-xs font-semibold text-muted-foreground">--</span>
              </div>
              <div className="h-1.5 bg-foreground/8 rounded-full" />
            </div>
          ))
      }
    </div>
  );
}
