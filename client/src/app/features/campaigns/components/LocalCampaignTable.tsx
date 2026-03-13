// LocalCampaignTable.tsx
// Table for local DB campaigns with real metrics from campaign_metrics.
// Includes checkbox selection, bulk operations (delete/status), column visibility, Clone and Delete actions.
import { useState, useMemo } from "react";
import {
  Loader2, Plus, Play, Pause, ArrowUpRight, Copy, Trash2, MoreHorizontal,
  CheckSquare, Square, ChevronDown, Eye, EyeOff, Settings2,
} from "lucide-react";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { getPlatform } from "@shared/platforms";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/core/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/core/components/ui/alert-dialog";

const statusDot: Record<string, string> = {
  active: "bg-emerald-500", paused: "bg-amber-500",
  draft: "bg-neutral-400", ended: "bg-neutral-300", scheduled: "bg-blue-400",
};
const statusBadge: Record<string, string> = {
  active:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  paused:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  draft:     "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  ended:     "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500",
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

interface LocalCampaign {
  id: number;
  name: string;
  platform: string;
  status: string;
  budget: string | null;
  objective: string | null;
  totalImpressions?: number;
  totalClicks?: number;
  totalSpend?: number;
  totalReach?: number;
  avgCtr?: number;
  avgCpc?: number;
  avgRoas?: number;
}

interface LocalCampaignTableProps {
  campaigns: LocalCampaign[];
  loading: boolean;
  onStatusChange: (id: number, status: string) => void;
  onCreateNew: () => void;
}

function fmt(n: number | undefined, type: "currency" | "number" | "percent" | "compact"): string {
  if (n == null || isNaN(n)) return "—";
  switch (type) {
    case "currency": return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    case "percent":  return `${n.toFixed(2)}%`;
    case "compact":  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);
    case "number":   return n.toLocaleString();
  }
}

type ColumnKey = "platform" | "status" | "budget" | "impressions" | "clicks" | "spend" | "ctr" | "roas";
const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "platform",    label: "Platform" },
  { key: "status",      label: "Status" },
  { key: "budget",      label: "Budget" },
  { key: "impressions", label: "Impressions" },
  { key: "clicks",      label: "Clicks" },
  { key: "spend",       label: "Spend" },
  { key: "ctr",         label: "CTR" },
  { key: "roas",        label: "ROAS" },
];

export function LocalCampaignTable({ campaigns, loading, onStatusChange, onCreateNew }: LocalCampaignTableProps) {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Set<ColumnKey>>(new Set(ALL_COLUMNS.map(c => c.key)));

  const cloneCampaign = trpc.campaigns.clone.useMutation({
    onSuccess: (cloned) => {
      utils.campaigns.list.invalidate();
      toast.success(t("campaigns.cloned", `Campaign cloned as "${cloned?.name}"`));
    },
    onError: () => toast.error(t("common.error")),
  });

  const deleteCampaign = trpc.campaigns.delete.useMutation({
    onSuccess: () => {
      utils.campaigns.list.invalidate();
      setDeleteId(null);
      toast.success(t("campaigns.deleted", "Campaign deleted"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const bulkDelete = trpc.campaigns.bulkDelete.useMutation({
    onSuccess: (res) => {
      utils.campaigns.list.invalidate();
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      toast.success(`${res.count} campaign${res.count !== 1 ? "s" : ""} deleted`);
    },
    onError: () => toast.error(t("common.error")),
  });

  const bulkUpdateStatus = trpc.campaigns.bulkUpdateStatus.useMutation({
    onSuccess: (res) => {
      utils.campaigns.list.invalidate();
      setSelectedIds(new Set());
      toast.success(`${res.count} campaign${res.count !== 1 ? "s" : ""} updated`);
    },
    onError: () => toast.error(t("common.error")),
  });

  const allSelected = campaigns.length > 0 && selectedIds.size === campaigns.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < campaigns.length;

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(campaigns.map(c => c.id)));
  };
  const toggleOne = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleCol = (key: ColumnKey) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="glass rounded-2xl flex items-center justify-center py-16 gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">{t("common.loading")}</span>
      </div>
    );
  }

  const totalSpend       = campaigns.reduce((s, c) => s + (c.totalSpend       ?? 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.totalImpressions ?? 0), 0);
  const totalClicks      = campaigns.reduce((s, c) => s + (c.totalClicks      ?? 0), 0);
  const avgCtr           = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const hasMetrics       = campaigns.some(c => (c.totalImpressions ?? 0) > 0);

  const campaignToDelete = campaigns.find((c) => c.id === deleteId);
  const selectedCampaigns = campaigns.filter(c => selectedIds.has(c.id));

  return (
    <div className="space-y-4">
      {/* KPI Summary Bar */}
      {hasMetrics && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: t("campaigns.totalSpend", "Total Spend"),   value: fmt(totalSpend, "currency"),     icon: "💰" },
            { label: t("campaigns.impressions", "Impressions"),  value: fmt(totalImpressions, "compact"), icon: "👁" },
            { label: t("campaigns.clicks", "Clicks"),            value: fmt(totalClicks, "compact"),      icon: "🖱" },
            { label: t("campaigns.avgCtr", "Avg CTR"),           value: fmt(avgCtr, "percent"),           icon: "📈" },
          ].map(kpi => (
            <div key={kpi.label} className="glass rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base">{kpi.icon}</span>
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <div className="text-lg font-bold text-foreground">{kpi.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        {/* Bulk Actions Toolbar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 border-b border-primary/20">
            <span className="text-xs font-medium text-primary">
              {selectedIds.size} selected
            </span>
            <div className="flex items-center gap-1.5 ml-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors">
                    Change Status
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  {(["active", "paused", "ended", "draft"] as const).map(s => (
                    <DropdownMenuItem
                      key={s}
                      className="text-xs gap-2"
                      onClick={() => bulkUpdateStatus.mutate({ campaignIds: Array.from(selectedIds), status: s })}
                      disabled={bulkUpdateStatus.isPending}
                    >
                      <span className={`w-2 h-2 rounded-full ${statusDot[s]}`} />
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                onClick={() => setBulkDeleteOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-medium transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Delete {selectedIds.size}
              </button>
            </div>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        {/* Column Visibility Control */}
        <div className="flex items-center justify-end px-4 py-2 border-b border-foreground/5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Settings2 className="w-3.5 h-3.5" />
                Columns
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs">Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ALL_COLUMNS.map(col => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={visibleCols.has(col.key)}
                  onCheckedChange={() => toggleCol(col.key)}
                  className="text-xs"
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-foreground/5">
                {/* Checkbox column */}
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleAll} className="flex items-center justify-center">
                    {allSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : someSelected ? (
                      <div className="w-4 h-4 rounded border-2 border-primary bg-primary/20 flex items-center justify-center">
                        <div className="w-2 h-0.5 bg-primary" />
                      </div>
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {t("campaigns.campaign", "Campaign")}
                </th>
                {visibleCols.has("platform")    && <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{t("campaigns.platform", "Platform")}</th>}
                {visibleCols.has("status")      && <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{t("campaigns.statusLabel", "Status")}</th>}
                {visibleCols.has("budget")      && <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{t("campaigns.budget", "Budget")}</th>}
                {visibleCols.has("impressions") && <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{t("campaigns.impressions", "Impressions")}</th>}
                {visibleCols.has("clicks")      && <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{t("campaigns.clicks", "Clicks")}</th>}
                {visibleCols.has("spend")       && <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{t("campaigns.spend", "Spend")}</th>}
                {visibleCols.has("ctr")         && <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">CTR</th>}
                {visibleCols.has("roas")        && <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">ROAS</th>}
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const pl = getPlatform(c.platform);
                const isSelected = selectedIds.has(c.id);
                return (
                  <tr
                    key={c.id}
                    className={`border-b border-foreground/5 last:border-0 transition-colors group ${isSelected ? "bg-primary/5" : "hover:bg-foreground/3"}`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3.5 w-10">
                      <button onClick={() => toggleOne(c.id)} className="flex items-center justify-center">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-sm font-medium max-w-[180px] truncate">{c.name}</div>
                      {c.objective && <div className="text-[10px] text-muted-foreground capitalize mt-0.5">{c.objective.replace(/_/g, " ")}</div>}
                    </td>
                    {visibleCols.has("platform") && (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <PlatformIcon platform={c.platform} className={`w-3.5 h-3.5 ${pl.textColor}`} />
                          <span className="text-xs text-muted-foreground capitalize">{c.platform}</span>
                        </div>
                      </td>
                    )}
                    {visibleCols.has("status") && (
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${statusBadge[c.status] ?? statusBadge.draft}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDot[c.status] ?? "bg-neutral-300"}`} />
                          {c.status}
                        </span>
                      </td>
                    )}
                    {visibleCols.has("budget") && (
                      <td className="px-4 py-3.5 text-sm text-muted-foreground">
                        {c.budget ? `$${parseFloat(c.budget).toLocaleString()}` : "—"}
                      </td>
                    )}
                    {visibleCols.has("impressions") && (
                      <td className="px-4 py-3.5 text-sm font-medium">
                        {(c.totalImpressions ?? 0) > 0 ? fmt(c.totalImpressions, "compact") : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                    )}
                    {visibleCols.has("clicks") && (
                      <td className="px-4 py-3.5 text-sm">
                        {(c.totalClicks ?? 0) > 0 ? fmt(c.totalClicks, "compact") : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                    )}
                    {visibleCols.has("spend") && (
                      <td className="px-4 py-3.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        {(c.totalSpend ?? 0) > 0 ? fmt(c.totalSpend, "currency") : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                    )}
                    {visibleCols.has("ctr") && (
                      <td className="px-4 py-3.5 text-sm">
                        {(c.avgCtr ?? 0) > 0 ? (
                          <span className={`font-medium ${(c.avgCtr ?? 0) >= 3 ? "text-emerald-600 dark:text-emerald-400" : (c.avgCtr ?? 0) >= 1.5 ? "text-amber-600" : "text-red-500"}`}>
                            {fmt(c.avgCtr, "percent")}
                          </span>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                    )}
                    {visibleCols.has("roas") && (
                      <td className="px-4 py-3.5 text-sm">
                        {(c.avgRoas ?? 0) > 0 ? (
                          <span className={`font-medium ${(c.avgRoas ?? 0) >= 4 ? "text-emerald-600 dark:text-emerald-400" : (c.avgRoas ?? 0) >= 2 ? "text-amber-600" : "text-red-500"}`}>
                            {(c.avgRoas ?? 0).toFixed(2)}x
                          </span>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                    )}
                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {c.status === "active" && (
                          <button onClick={() => onStatusChange(c.id, "paused")} className="p-1.5 rounded-lg hover:bg-foreground/8 transition-colors" title={t("campaigns.pause", "Pause")}>
                            <Pause className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        )}
                        {c.status === "paused" && (
                          <button onClick={() => onStatusChange(c.id, "active")} className="p-1.5 rounded-lg hover:bg-foreground/8 transition-colors" title={t("campaigns.resume", "Resume")}>
                            <Play className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        )}
                        {c.status === "draft" && (
                          <button onClick={() => onStatusChange(c.id, "active")} className="p-1.5 rounded-lg hover:bg-foreground/8 transition-colors" title={t("campaigns.activate", "Activate")}>
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                          </button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded-lg hover:bg-foreground/8 transition-colors">
                              <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => cloneCampaign.mutate({ campaignId: c.id })}
                              disabled={cloneCampaign.isPending}
                              className="gap-2 text-xs"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              {t("campaigns.clone", "Clone Campaign")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteId(c.id)}
                              className="gap-2 text-xs text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {t("campaigns.delete", "Delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {campaigns.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground">{t("campaigns.noCampaigns", "No campaigns yet. Create your first campaign!")}</p>
              <button
                onClick={onCreateNew}
                className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors mx-auto"
              >
                <Plus className="w-4 h-4" />
                {t("campaigns.newCampaign", "New Campaign")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Single Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("campaigns.deleteConfirmTitle", "Delete Campaign?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("campaigns.deleteConfirmDesc", `Are you sure you want to delete "${campaignToDelete?.name}"? This action cannot be undone.`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId !== null && deleteCampaign.mutate({ campaignId: deleteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCampaign.isPending ? t("common.loading") : t("campaigns.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Campaigns?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size} selected campaign{selectedIds.size !== 1 ? "s" : ""}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDelete.mutate({ campaignIds: Array.from(selectedIds) })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDelete.isPending ? t("common.loading") : `Delete ${selectedIds.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
