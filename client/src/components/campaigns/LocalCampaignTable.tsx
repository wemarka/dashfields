/**
 * LocalCampaignTable.tsx
 * Table for local DB campaigns with real metrics from campaign_metrics.
 * Includes Clone and Delete actions.
 */
import { useState } from "react";
import { Loader2, Plus, Play, Pause, ArrowUpRight, Copy, Trash2, MoreHorizontal } from "lucide-react";
import { PlatformIcon } from "@/components/PlatformIcon";
import { getPlatform } from "@shared/platforms";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusDot: Record<string, string> = {
  active: "bg-emerald-500", paused: "bg-amber-500",
  draft: "bg-slate-400", ended: "bg-slate-300", scheduled: "bg-blue-400",
};
const statusBadge: Record<string, string> = {
  active:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  paused:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  draft:     "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  ended:     "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500",
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

export function LocalCampaignTable({ campaigns, loading, onStatusChange, onCreateNew }: LocalCampaignTableProps) {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const [deleteId, setDeleteId] = useState<number | null>(null);

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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-foreground/5">
                {[
                  t("campaigns.campaign", "Campaign"),
                  t("campaigns.platform", "Platform"),
                  t("campaigns.status", "Status"),
                  t("campaigns.budget", "Budget"),
                  t("campaigns.impressions", "Impressions"),
                  t("campaigns.clicks", "Clicks"),
                  t("campaigns.spend", "Spend"),
                  "CTR",
                  "ROAS",
                  "",
                ].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const pl = getPlatform(c.platform);
                return (
                  <tr key={c.id} className="border-b border-foreground/5 last:border-0 hover:bg-foreground/3 transition-colors group">
                    <td className="px-4 py-3.5">
                      <div className="text-sm font-medium max-w-[180px] truncate">{c.name}</div>
                      {c.objective && <div className="text-[10px] text-muted-foreground capitalize mt-0.5">{c.objective.replace(/_/g, " ")}</div>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <PlatformIcon platform={c.platform} className={`w-3.5 h-3.5 ${pl.textColor}`} />
                        <span className="text-xs text-muted-foreground capitalize">{c.platform}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${statusBadge[c.status] ?? statusBadge.draft}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDot[c.status] ?? "bg-slate-300"}`} />
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">
                      {c.budget ? `$${parseFloat(c.budget).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-medium">
                      {(c.totalImpressions ?? 0) > 0 ? fmt(c.totalImpressions, "compact") : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      {(c.totalClicks ?? 0) > 0 ? fmt(c.totalClicks, "compact") : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {(c.totalSpend ?? 0) > 0 ? fmt(c.totalSpend, "currency") : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      {(c.avgCtr ?? 0) > 0 ? (
                        <span className={`font-medium ${(c.avgCtr ?? 0) >= 3 ? "text-emerald-600 dark:text-emerald-400" : (c.avgCtr ?? 0) >= 1.5 ? "text-amber-600" : "text-red-500"}`}>
                          {fmt(c.avgCtr, "percent")}
                        </span>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      {(c.avgRoas ?? 0) > 0 ? (
                        <span className={`font-medium ${(c.avgRoas ?? 0) >= 4 ? "text-emerald-600 dark:text-emerald-400" : (c.avgRoas ?? 0) >= 2 ? "text-amber-600" : "text-red-500"}`}>
                          {(c.avgRoas ?? 0).toFixed(2)}x
                        </span>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
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

      {/* Delete Confirmation Dialog */}
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
    </div>
  );
}
