/**
 * CreditUsageBar — Shows token/credit usage with a progress bar.
 * Uses neutral palette with brand-red for high usage.
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
        <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium">
          Credits
        </span>
        <span className="text-[11px] text-neutral-400">
          {used.toLocaleString()} / {total.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isHigh
              ? "bg-gradient-to-r from-red-500 to-red-600"
              : "bg-gradient-to-r from-brand to-red-500/70"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
