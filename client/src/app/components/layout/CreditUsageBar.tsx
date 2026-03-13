/**
 * CreditUsageBar — Shows token/credit usage with a progress bar.
 */

interface CreditUsageBarProps {
  used: number;
  total: number;
}

export function CreditUsageBar({ used, total }: CreditUsageBarProps) {
  const pct = Math.min((used / total) * 100, 100);
  const isHigh = pct > 80;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          Credits
        </span>
        <span className="text-[11px] text-muted-foreground">
          {used.toLocaleString()} / {total.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isHigh
              ? "bg-gradient-to-r from-amber-500 to-orange-500"
              : "bg-gradient-to-r from-violet-500 to-indigo-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
