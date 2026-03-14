/**
 * PerformanceGoals.tsx
 * DashFields — KPI Goal Tracking
 * Set performance targets and track progress across metrics.
 */
import { useState } from "react";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import {
  Target, Plus, Trash2, Edit3, TrendingUp, TrendingDown,
  CheckCircle2, Pause, XCircle, BarChart3, Trophy,
  Calendar, ChevronRight,
} from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Badge } from "@/core/components/ui/badge";
import { Progress } from "@/core/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/core/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/core/components/ui/select";
import { Textarea } from "@/core/components/ui/textarea";
import { Label } from "@/core/components/ui/label";

// ─── Types ────────────────────────────────────────────────────────────────────
interface GoalRow {
  id: number;
  name: string;
  metric: string;
  target_value: number;
  current_value: number;
  platform: string | null;
  period: string;
  status: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_at: string;
}

const METRICS = [
  { value: "impressions",      label: "Impressions",      icon: "👁" },
  { value: "clicks",           label: "Clicks",           icon: "🖱" },
  { value: "conversions",      label: "Conversions",      icon: "🎯" },
  { value: "spend",            label: "Ad Spend ($)",     icon: "💰" },
  { value: "roas",             label: "ROAS",             icon: "📈" },
  { value: "ctr",              label: "CTR (%)",          icon: "%" },
  { value: "cpc",              label: "CPC ($)",          icon: "💲" },
  { value: "cpm",              label: "CPM ($)",          icon: "📊" },
  { value: "followers",        label: "Followers",        icon: "👥" },
  { value: "engagement_rate",  label: "Engagement Rate",  icon: "❤️" },
  { value: "reach",            label: "Reach",            icon: "📡" },
  { value: "video_views",      label: "Video Views",      icon: "▶️" },
];

const PERIODS  = ["weekly", "monthly", "quarterly", "yearly"];
const STATUSES = ["active", "completed", "paused", "failed"];
const PLATFORMS = ["instagram", "facebook", "twitter", "linkedin", "tiktok", "youtube", "all"];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active:    { label: "Active",    color: "text-brand",  icon: TrendingUp   },
  completed: { label: "Completed", color: "text-foreground", icon: CheckCircle2 },
  paused:    { label: "Paused",    color: "text-yellow-500",icon: Pause        },
  failed:    { label: "Failed",    color: "text-red-500",   icon: XCircle      },
};

function formatMetricValue(metric: string, value: number): string {
  if (["spend", "cpc", "cpm"].includes(metric)) return `$${value.toLocaleString()}`;
  if (["ctr", "engagement_rate", "roas"].includes(metric)) return `${value.toFixed(2)}`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

// ─── Goal Card ────────────────────────────────────────────────────────────────
function GoalCard({
  goal,
  onEdit,
  onDelete,
  onUpdateProgress,
}: {
  goal: GoalRow;
  onEdit: (g: GoalRow) => void;
  onDelete: (id: number) => void;
  onUpdateProgress: (id: number, current: number) => void;
}) {
  const [editingProgress, setEditingProgress] = useState(false);
  const [newProgress, setNewProgress] = useState(goal.current_value.toString());

  const pct = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
  const metricInfo = METRICS.find(m => m.value === goal.metric);
  const statusCfg  = STATUS_CONFIG[goal.status] ?? STATUS_CONFIG.active;
  const StatusIcon = statusCfg.icon;

  const handleSaveProgress = () => {
    const val = parseFloat(newProgress);
    if (isNaN(val)) return;
    onUpdateProgress(goal.id, val);
    setEditingProgress(false);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">
            {metricInfo?.icon ?? "📊"}
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">{goal.name}</h3>
            <p className="text-xs text-muted-foreground capitalize">
              {metricInfo?.label ?? goal.metric} · {goal.period}
              {goal.platform && goal.platform !== "all" && ` · ${goal.platform}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`flex items-center gap-1 text-xs font-medium ${statusCfg.color}`}>
            <StatusIcon className="w-3 h-3" />
            {statusCfg.label}
          </span>
          <button onClick={() => onEdit(goal)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(goal.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className={`font-bold ${pct >= 100 ? "text-brand" : pct >= 70 ? "text-primary" : "text-muted-foreground"}`}>
            {pct}%
          </span>
        </div>
        <Progress value={pct} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatMetricValue(goal.metric, goal.current_value)} current</span>
          <span>{formatMetricValue(goal.metric, goal.target_value)} target</span>
        </div>
      </div>

      {/* Update Progress */}
      {editingProgress ? (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={newProgress}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProgress(e.target.value)}
            className="h-8 text-xs"
            autoFocus
          />
          <Button size="sm" onClick={handleSaveProgress} className="h-8 text-xs">Save</Button>
          <Button size="sm" variant="outline" onClick={() => setEditingProgress(false)} className="h-8 text-xs">Cancel</Button>
        </div>
      ) : (
        <button
          onClick={() => setEditingProgress(true)}
          className="w-full text-xs text-primary hover:text-primary/80 flex items-center justify-center gap-1 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
        >
          <ChevronRight className="w-3 h-3" />
          Update Progress
        </button>
      )}

      {/* Notes */}
      {goal.notes && (
        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border line-clamp-2">
          {goal.notes}
        </p>
      )}

      {/* Dates */}
      {goal.end_date && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
          <Calendar className="w-3 h-3" />
          Due: {new Date(goal.end_date).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

// ─── Goal Form Modal ──────────────────────────────────────────────────────────
function GoalFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: GoalRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name,        setName]        = useState(initial?.name ?? "");
  const [metric,      setMetric]      = useState(initial?.metric ?? "impressions");
  const [targetValue, setTargetValue] = useState(initial?.target_value?.toString() ?? "");
  const [platform,    setPlatform]    = useState(initial?.platform ?? "all");
  const [period,      setPeriod]      = useState(initial?.period ?? "monthly");
  const [status,      setStatus]      = useState(initial?.status ?? "active");
  const [endDate,     setEndDate]     = useState(initial?.end_date?.slice(0, 10) ?? "");
  const [notes,       setNotes]       = useState(initial?.notes ?? "");

  const createMutation = trpc.performanceGoals.create.useMutation({ onSuccess: onSaved, onError: e => toast.error(e.message) });
  const updateMutation = trpc.performanceGoals.update.useMutation({ onSuccess: onSaved, onError: e => toast.error(e.message) });

  const handleSave = () => {
    if (!name.trim())   { toast.error("Name is required"); return; }
    if (!targetValue)   { toast.error("Target value is required"); return; }
    const payload = {
      name:        name.trim(),
      metric:      metric as "impressions",
      targetValue: parseFloat(targetValue),
      platform:    platform === "all" ? undefined : platform,
      period:      period as "monthly",
      endDate:     endDate || undefined,
      notes:       notes.trim() || undefined,
    };
    if (initial) {
      updateMutation.mutate({ id: initial.id, ...payload, status: status as "active" });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Goal" : "Create Performance Goal"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Goal Name *</Label>
            <Input value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="e.g. Reach 100K impressions" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Metric *</Label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METRICS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.icon} {m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Target Value *</Label>
              <Input type="number" value={targetValue} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetValue(e.target.value)} placeholder="100000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => (
                    <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIODS.map(p => (
                    <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {initial && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Due Date (optional)</Label>
            <Input type="date" value={endDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)} rows={2} placeholder="Additional context..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : initial ? "Update Goal" : "Create Goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PerformanceGoals() {
  usePageTitle("Performance Goals");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showModal,    setShowModal]    = useState(false);
  const [editTarget,   setEditTarget]   = useState<GoalRow | null>(null);

  const utils = trpc.useUtils();
  const { data: goals = [], isLoading } = trpc.performanceGoals.list.useQuery(
    filterStatus !== "all" ? { status: filterStatus as "active" } : undefined
  );

  const deleteMutation = trpc.performanceGoals.delete.useMutation({
    onSuccess: () => { toast.success("Goal deleted"); utils.performanceGoals.list.invalidate(); },
    onError: e => toast.error(e.message),
  });

  const progressMutation = trpc.performanceGoals.updateProgress.useMutation({
    onSuccess: () => { toast.success("Progress updated!"); utils.performanceGoals.list.invalidate(); },
    onError: e => toast.error(e.message),
  });

  const handleSaved = () => {
    toast.success(editTarget ? "Goal updated!" : "Goal created!");
    setShowModal(false);
    setEditTarget(null);
    utils.performanceGoals.list.invalidate();
  };

  const allGoals = goals as GoalRow[];
  const stats = {
    total:     allGoals.length,
    active:    allGoals.filter(g => g.status === "active").length,
    completed: allGoals.filter(g => g.status === "completed").length,
    avgPct:    allGoals.length
      ? Math.round(allGoals.reduce((s, g) => s + Math.min(100, (g.current_value / g.target_value) * 100), 0) / allGoals.length)
      : 0,
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            Performance Goals
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Set KPI targets and track your progress toward them
          </p>
        </div>
        <Button onClick={() => { setEditTarget(null); setShowModal(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          New Goal
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Goals",    value: stats.total,     icon: BarChart3,   color: "text-primary"       },
          { label: "Active",         value: stats.active,    icon: TrendingUp,  color: "text-brand"      },
          { label: "Completed",      value: stats.completed, icon: Trophy,      color: "text-foreground"     },
          { label: "Avg Progress",   value: `${stats.avgPct}%`, icon: Target,  color: "text-orange-500"    },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {["all", ...STATUSES].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              filterStatus === s
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Goals Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 h-44 animate-pulse" />
          ))}
        </div>
      ) : allGoals.length === 0 ? (
        <div className="text-center py-16">
          <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <h3 className="font-semibold text-foreground mb-1">No goals yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Set performance targets to track your marketing KPIs
          </p>
          <Button onClick={() => { setEditTarget(null); setShowModal(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Create First Goal
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allGoals.map(g => (
            <GoalCard
              key={g.id}
              goal={g}
              onEdit={goal => { setEditTarget(goal); setShowModal(true); }}
              onDelete={id => {
                if (!confirm("Delete this goal?")) return;
                deleteMutation.mutate({ id });
              }}
              onUpdateProgress={(id, current) => progressMutation.mutate({ id, currentValue: current })}
            />
          ))}
        </div>
      )}

      {showModal && (
        <GoalFormModal
          initial={editTarget}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
