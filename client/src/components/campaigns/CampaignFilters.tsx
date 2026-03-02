/**
 * CampaignFilters.tsx
 * Search bar + status filter + date preset selector for Campaigns page.
 */
import { Search } from "lucide-react";

interface CampaignFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  filter: string;
  onFilterChange: (v: string) => void;
  showDatePreset?: boolean;
  datePreset?: string;
  onDatePresetChange?: (v: string) => void;
}

const STATUS_FILTERS = ["all", "active", "paused", "draft"];

const DATE_PRESETS = [
  { label: "Today",      value: "today" },
  { label: "Yesterday",  value: "yesterday" },
  { label: "Last 7d",    value: "last_7d" },
  { label: "Last 30d",   value: "last_30d" },
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
];

export function CampaignFilters({
  search, onSearchChange,
  filter, onFilterChange,
  showDatePreset, datePreset, onDatePresetChange,
}: CampaignFiltersProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search campaigns..."
          className="w-full pl-9 pr-4 py-2 rounded-xl glass text-sm outline-none focus:ring-2 focus:ring-foreground/20"
        />
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-1 glass rounded-xl p-1">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => onFilterChange(s)}
            className={
              "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all " +
              (filter === s ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")
            }
          >
            {s}
          </button>
        ))}
      </div>

      {/* Date preset (Meta only) */}
      {showDatePreset && onDatePresetChange && (
        <select
          value={datePreset}
          onChange={(e) => onDatePresetChange(e.target.value)}
          className="glass rounded-xl px-3 py-2 text-xs outline-none"
        >
          {DATE_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}
