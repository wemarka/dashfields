/**
 * DatePresetSelector.tsx
 * Date range preset pill selector for the Dashboard.
 */

export const DATE_PRESETS = [
  { label: "Today",      value: "today" },
  { label: "Yesterday",  value: "yesterday" },
  { label: "Last 7d",    value: "last_7d" },
  { label: "Last 30d",   value: "last_30d" },
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
] as const;

export type DatePreset = typeof DATE_PRESETS[number]["value"];

interface DatePresetSelectorProps {
  value: DatePreset;
  onChange: (v: DatePreset) => void;
}

export function DatePresetSelector({ value, onChange }: DatePresetSelectorProps) {
  return (
    <div className="flex items-center gap-1 glass rounded-xl p-1">
      {DATE_PRESETS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all " +
            (value === p.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
