// CampaignFilters.tsx
// Professional, platform-agnostic filter bar for the unified Campaigns page.
// Includes search, status filter, platform filter, date range, and column settings.
import { Search, SlidersHorizontal, X } from "lucide-react";
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
import { Checkbox } from "@/core/components/ui/checkbox";
import { useTranslation } from "react-i18next";

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
}

const STATUS_OPTIONS = [
  { value: "all",       label: "All Statuses" },
  { value: "active",    label: "Active" },
  { value: "paused",    label: "Paused" },
  { value: "draft",     label: "Draft" },
  { value: "ended",     label: "Ended" },
  { value: "scheduled", label: "Scheduled" },
];

const DATE_PRESETS = [
  { value: "today",      label: "Today" },
  { value: "yesterday",  label: "Yesterday" },
  { value: "last_7d",    label: "Last 7 days" },
  { value: "last_14d",   label: "Last 14 days" },
  { value: "last_30d",   label: "Last 30 days" },
  { value: "last_90d",   label: "Last 90 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
];

export function CampaignFilters({
  search, onSearchChange,
  statusFilter, onStatusFilterChange,
  platformFilter, onPlatformFilterChange,
  datePreset, onDatePresetChange,
  connectedPlatforms,
  activeFilterCount,
  onClearFilters,
}: CampaignFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
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
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      s.value === "active" ? "bg-emerald-500" :
                      s.value === "paused" ? "bg-amber-500" :
                      s.value === "draft" ? "bg-slate-400" :
                      s.value === "ended" ? "bg-slate-300" :
                      "bg-blue-400"
                    }`} />
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

        {/* Date range */}
        <Select value={datePreset} onValueChange={onDatePresetChange}>
          <SelectTrigger className="h-9 w-[140px] text-xs">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map((d) => (
              <SelectItem key={d.value} value={d.value} className="text-xs">
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear filters */}
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
    </div>
  );
}
