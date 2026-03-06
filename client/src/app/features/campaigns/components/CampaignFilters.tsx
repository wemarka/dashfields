// CampaignFilters.tsx
// Professional, platform-agnostic filter bar with:
// - Search input
// - Status filter
// - Platform filter
// - Date Range Picker (presets + custom range)
// - Active filter chips with remove buttons
import { useState, useMemo } from "react";
import { Search, X, CalendarIcon, SlidersHorizontal } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { PLATFORMS, type PlatformId } from "@shared/platforms";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/core/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/core/components/ui/popover";
import { Calendar } from "@/core/components/ui/calendar";
import { useTranslation } from "react-i18next";

// ─── Types ────────────────────────────────────────────────────────────────────
export type DatePreset = "today" | "yesterday" | "last_7d" | "last_14d" | "last_30d" | "last_90d" | "this_month" | "last_month" | "custom";

interface CampaignFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  platformFilter: string;
  onPlatformFilterChange: (v: string) => void;
  datePreset: string;
  onDatePresetChange: (v: string) => void;
  connectedPlatforms: string[];
  activeFilterCount: number;
  onClearFilters: () => void;
  // Custom date range
  customDateRange?: DateRange;
  onCustomDateRangeChange?: (range: DateRange | undefined) => void;
}

const STATUS_OPTIONS = [
  { value: "all",       label: "All Statuses" },
  { value: "active",    label: "Active" },
  { value: "paused",    label: "Paused" },
  { value: "draft",     label: "Draft" },
  { value: "ended",     label: "Ended" },
  { value: "scheduled", label: "Scheduled" },
];

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today",      label: "Today" },
  { value: "yesterday",  label: "Yesterday" },
  { value: "last_7d",    label: "Last 7 days" },
  { value: "last_14d",   label: "Last 14 days" },
  { value: "last_30d",   label: "Last 30 days" },
  { value: "last_90d",   label: "Last 90 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
];

const STATUS_DOTS: Record<string, string> = {
  active: "bg-emerald-500",
  paused: "bg-amber-500",
  draft: "bg-slate-400",
  ended: "bg-slate-300",
  scheduled: "bg-blue-400",
};

// ─── Component ────────────────────────────────────────────────────────────────
export function CampaignFilters({
  search, onSearchChange,
  statusFilter, onStatusFilterChange,
  platformFilter, onPlatformFilterChange,
  datePreset, onDatePresetChange,
  connectedPlatforms,
  activeFilterCount,
  onClearFilters,
  customDateRange,
  onCustomDateRangeChange,
}: CampaignFiltersProps) {
  const { t } = useTranslation();
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Build active filter chips
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];

    if (search) {
      chips.push({
        key: "search",
        label: `Search: "${search}"`,
        onRemove: () => onSearchChange(""),
      });
    }

    if (statusFilter !== "all") {
      const opt = STATUS_OPTIONS.find(s => s.value === statusFilter);
      chips.push({
        key: "status",
        label: `Status: ${opt?.label ?? statusFilter}`,
        onRemove: () => onStatusFilterChange("all"),
      });
    }

    if (platformFilter !== "all") {
      const p = PLATFORMS.find(pl => pl.id === platformFilter);
      chips.push({
        key: "platform",
        label: `Platform: ${platformFilter === "local" ? "Local" : p?.name ?? platformFilter}`,
        onRemove: () => onPlatformFilterChange("all"),
      });
    }

    if (datePreset !== "last_30d") {
      const preset = DATE_PRESETS.find(d => d.value === datePreset);
      let label = preset?.label ?? datePreset;
      if (datePreset === "custom" && customDateRange?.from) {
        label = `${format(customDateRange.from, "MMM d")}${customDateRange.to ? ` – ${format(customDateRange.to, "MMM d")}` : ""}`;
      }
      chips.push({
        key: "date",
        label: `Date: ${label}`,
        onRemove: () => {
          onDatePresetChange("last_30d");
          onCustomDateRangeChange?.(undefined);
        },
      });
    }

    return chips;
  }, [search, statusFilter, platformFilter, datePreset, customDateRange, onSearchChange, onStatusFilterChange, onPlatformFilterChange, onDatePresetChange, onCustomDateRangeChange]);

  // Format date range display
  const dateDisplayLabel = useMemo(() => {
    if (datePreset === "custom" && customDateRange?.from) {
      const fromStr = format(customDateRange.from, "MMM d");
      const toStr = customDateRange.to ? format(customDateRange.to, "MMM d, yyyy") : "...";
      return `${fromStr} – ${toStr}`;
    }
    return DATE_PRESETS.find(d => d.value === datePreset)?.label ?? "Last 30 days";
  }, [datePreset, customDateRange]);

  return (
    <div className="flex flex-col gap-2.5">
      {/* Main filter row */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search campaigns..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-input bg-transparent text-sm outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-all placeholder:text-muted-foreground"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="h-9 w-[140px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-xs">
                <div className="flex items-center gap-2">
                  {s.value !== "all" && (
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOTS[s.value] ?? "bg-slate-400"}`} />
                  )}
                  {s.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Platform filter */}
        <Select value={platformFilter} onValueChange={onPlatformFilterChange}>
          <SelectTrigger className="h-9 w-[160px] text-xs">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Platforms</SelectItem>
            {connectedPlatforms.map((pid) => {
              const p = PLATFORMS.find(pl => pl.id === pid);
              return (
                <SelectItem key={pid} value={pid} className="text-xs">
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform={pid} className="w-3.5 h-3.5" />
                    {p?.name ?? pid}
                  </div>
                </SelectItem>
              );
            })}
            <SelectItem value="local" className="text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground">L</span>
                Local
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Date Range Picker */}
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`h-9 text-xs gap-1.5 min-w-[160px] justify-start font-normal ${
                datePreset !== "last_30d" ? "border-primary/50 text-primary" : ""
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              {dateDisplayLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex">
              {/* Preset sidebar */}
              <div className="border-r border-border p-2 space-y-0.5 min-w-[130px]">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                  Quick Select
                </p>
                {DATE_PRESETS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => {
                      onDatePresetChange(d.value);
                      onCustomDateRangeChange?.(undefined);
                      setDatePickerOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                      datePreset === d.value
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
                <div className="border-t border-border my-1" />
                <button
                  onClick={() => {
                    onDatePresetChange("custom");
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    datePreset === "custom"
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  Custom Range
                </button>
              </div>

              {/* Calendar */}
              <div className="p-2">
                <Calendar
                  mode="range"
                  selected={customDateRange}
                  onSelect={(range) => {
                    onCustomDateRangeChange?.(range);
                    if (range?.from) {
                      onDatePresetChange("custom");
                    }
                    if (range?.from && range?.to) {
                      // Auto-close after both dates selected
                      setTimeout(() => setDatePickerOpen(false), 300);
                    }
                  }}
                  numberOfMonths={2}
                  disabled={{ after: new Date() }}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear all filters */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <X className="w-3 h-3" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <SlidersHorizontal className="w-3 h-3 text-muted-foreground mr-0.5" />
          {activeChips.map((chip) => (
            <Badge
              key={chip.key}
              variant="secondary"
              className="h-6 text-[11px] font-normal gap-1 pl-2 pr-1 cursor-default"
            >
              {chip.label}
              <button
                onClick={chip.onRemove}
                className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10 transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
          {activeChips.length > 1 && (
            <button
              onClick={onClearFilters}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors ml-1"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
