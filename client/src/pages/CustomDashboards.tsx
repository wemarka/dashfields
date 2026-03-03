// CustomDashboards.tsx
// Allows users to build personalized dashboards with drag-and-drop widgets.
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import {
  LayoutDashboard, Plus, Trash2, Edit3, Copy, Star, StarOff,
  X, GripVertical, BarChart3, TrendingUp, Users, DollarSign,
  Activity, Target, Zap, Eye, MousePointer, RefreshCw, ChevronDown, ChevronUp,
  Check, Settings2,
} from "lucide-react";

// ─── Widget Catalog ────────────────────────────────────────────────────────────
const WIDGET_CATALOG = [
  { type: "impressions",    title: "Total Impressions",    icon: Eye,          color: "blue",   description: "Aggregate impressions across all platforms" },
  { type: "clicks",         title: "Total Clicks",         icon: MousePointer, color: "green",  description: "Total link clicks and interactions" },
  { type: "spend",          title: "Ad Spend",             icon: DollarSign,   color: "amber",  description: "Total advertising spend this period" },
  { type: "ctr",            title: "Click-Through Rate",   icon: Target,       color: "violet", description: "Average CTR across campaigns" },
  { type: "campaigns",      title: "Active Campaigns",     icon: Zap,          color: "orange", description: "Number of currently running campaigns" },
  { type: "engagement",     title: "Engagement Rate",      icon: Activity,     color: "pink",   description: "Average engagement rate across posts" },
  { type: "reach",          title: "Total Reach",          icon: Users,        color: "teal",   description: "Unique users reached" },
  { type: "trend",          title: "Performance Trend",    icon: TrendingUp,   color: "indigo", description: "7-day performance trend chart" },
  { type: "platform_split", title: "Platform Breakdown",   icon: BarChart3,    color: "rose",   description: "Performance split by platform" },
  { type: "top_campaign",   title: "Top Campaign",         icon: Target,       color: "cyan",   description: "Best performing campaign this week" },
];

const COLOR_MAP: Record<string, string> = {
  blue:   "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  green:  "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  amber:  "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  pink:   "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
  teal:   "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  rose:   "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  cyan:   "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
};

// ─── Widget Preview ────────────────────────────────────────────────────────────
function WidgetPreview({ type, title }: { type: string; title: string }) {
  const catalog = WIDGET_CATALOG.find(w => w.type === type);
  const Icon = catalog?.icon ?? BarChart3;
  const colorClass = COLOR_MAP[catalog?.color ?? "blue"];

  // Simulated data for preview
  const previewData: Record<string, { value: string; change: string; positive: boolean }> = {
    impressions:    { value: "423K",   change: "+12.4%", positive: true  },
    clicks:         { value: "12.5K",  change: "+8.2%",  positive: true  },
    spend:          { value: "$1,245", change: "-3.1%",  positive: false },
    ctr:            { value: "2.96%",  change: "+0.4%",  positive: true  },
    campaigns:      { value: "8",      change: "+2",     positive: true  },
    engagement:     { value: "4.7%",   change: "+1.2%",  positive: true  },
    reach:          { value: "89K",    change: "+15.3%", positive: true  },
    trend:          { value: "↗ Up",   change: "+18%",   positive: true  },
    platform_split: { value: "3 Plat", change: "Active", positive: true  },
    top_campaign:   { value: "Summer", change: "ROAS 4x", positive: true },
  };

  const d = previewData[type] ?? { value: "—", change: "—", positive: true };

  return (
    <div className={`rounded-xl border p-4 ${colorClass} h-full flex flex-col justify-between`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold opacity-80 truncate">{title}</span>
        <Icon className="w-4 h-4 opacity-70 flex-shrink-0" />
      </div>
      <div>
        <div className="text-2xl font-bold">{d.value}</div>
        <div className={`text-xs mt-1 font-medium ${d.positive ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
          {d.change} vs last period
        </div>
      </div>
    </div>
  );
}

// ─── Create / Edit Dashboard Modal ────────────────────────────────────────────
interface DashboardModalProps {
  mode: "create" | "edit";
  initial?: { id?: number; name: string; description: string; widgets: WidgetItem[]; isDefault: boolean };
  onClose: () => void;
  onSaved: () => void;
}

interface WidgetItem {
  id: string;
  type: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function DashboardModal({ mode, initial, onClose, onSaved }: DashboardModalProps) {
  const [name,        setName]        = useState(initial?.name        ?? "My Dashboard");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isDefault,   setIsDefault]   = useState(initial?.isDefault   ?? false);
  const [widgets,     setWidgets]     = useState<WidgetItem[]>(initial?.widgets ?? []);
  const [showCatalog, setShowCatalog] = useState(false);

  const createMutation = trpc.customDashboards.create.useMutation({
    onSuccess: () => { toast.success("Dashboard created!"); onSaved(); onClose(); },
    onError:   (e) => toast.error("Failed: " + e.message),
  });
  const updateMutation = trpc.customDashboards.update.useMutation({
    onSuccess: () => { toast.success("Dashboard saved!"); onSaved(); onClose(); },
    onError:   (e) => toast.error("Failed: " + e.message),
  });

  const addWidget = (catalogItem: typeof WIDGET_CATALOG[0]) => {
    const newWidget: WidgetItem = {
      id:    `${catalogItem.type}_${Date.now()}`,
      type:  catalogItem.type,
      title: catalogItem.title,
      x: 0, y: widgets.length * 2, w: 4, h: 2,
    };
    setWidgets(prev => [...prev, newWidget]);
    setShowCatalog(false);
    toast.success(`Added "${catalogItem.title}" widget`);
  };

  const removeWidget = (id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  };

  const handleSave = () => {
    if (!name.trim()) { toast.error("Dashboard name is required"); return; }
    if (mode === "create") {
      createMutation.mutate({ name, description, widgets, isDefault });
    } else if (initial?.id) {
      updateMutation.mutate({ id: initial.id, name, description, widgets, isDefault });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {mode === "create" ? "Create Dashboard" : "Edit Dashboard"}
              </h2>
              <p className="text-xs text-muted-foreground">Configure your custom layout</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Name & Description */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Dashboard Name *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Weekly Overview"
                className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Description</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional description"
                className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Default toggle */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
            <button
              onClick={() => setIsDefault(v => !v)}
              className={`w-10 h-5 rounded-full transition-colors relative ${isDefault ? "bg-primary" : "bg-border"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isDefault ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
            <div>
              <div className="text-xs font-medium text-foreground">Set as Default Dashboard</div>
              <div className="text-[11px] text-muted-foreground">This dashboard will open by default when you visit the home page</div>
            </div>
          </div>

          {/* Widget list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-foreground">
                Widgets <span className="text-muted-foreground ml-1">({widgets.length})</span>
              </label>
              <button
                onClick={() => setShowCatalog(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Widget
                {showCatalog ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Widget Catalog */}
            {showCatalog && (
              <div className="grid grid-cols-2 gap-2 mb-4 p-3 rounded-xl bg-muted/50 border border-border">
                {WIDGET_CATALOG.map(item => {
                  const Icon = item.icon;
                  const colorClass = COLOR_MAP[item.color];
                  return (
                    <button
                      key={item.type}
                      onClick={() => addWidget(item)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left hover:opacity-90 transition-opacity ${colorClass}`}
                    >
                      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-semibold">{item.title}</div>
                        <div className="text-[10px] opacity-70 mt-0.5">{item.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Current widgets */}
            {widgets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <LayoutDashboard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No widgets yet. Add some from the catalog above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {widgets.map(w => (
                  <div key={w.id} className="relative group">
                    <WidgetPreview type={w.type} title={w.title} />
                    <button
                      onClick={() => removeWidget(w.id)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-50 transition-opacity cursor-grab">
                      <GripVertical className="w-4 h-4 text-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-5 border-t border-border">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isPending || !name.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {mode === "create" ? "Create Dashboard" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CustomDashboards() {
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<number | null>(null);

  const { data: dashboards = [], refetch, isLoading } = trpc.customDashboards.list.useQuery();

  const deleteMutation = trpc.customDashboards.delete.useMutation({
    onSuccess: () => { toast.success("Dashboard deleted"); refetch(); },
    onError:   (e) => toast.error("Failed: " + e.message),
  });
  const duplicateMutation = trpc.customDashboards.duplicate.useMutation({
    onSuccess: () => { toast.success("Dashboard duplicated"); refetch(); },
    onError:   (e) => toast.error("Failed: " + e.message),
  });
  const setDefaultMutation = trpc.customDashboards.update.useMutation({
    onSuccess: () => { toast.success("Default dashboard updated"); refetch(); },
    onError:   (e) => toast.error("Failed: " + e.message),
  });

  const editDashboard = dashboards.find(d => d.id === editTarget);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-violet-500" />
              Custom Dashboards
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Build personalized analytics views with the widgets that matter most to you.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Dashboard
          </button>
        </div>

        {/* Dashboard Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : dashboards.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-muted/20">
            <LayoutDashboard className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No custom dashboards yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Create your first custom dashboard to see the metrics that matter most to you in one place.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Your First Dashboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboards.map(dashboard => (
              <div
                key={dashboard.id}
                className="group relative bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-all hover:border-primary/30"
              >
                {/* Default badge */}
                {dashboard.is_default && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold border border-amber-500/20">
                    <Star className="w-2.5 h-2.5" />
                    Default
                  </div>
                )}

                {/* Title */}
                <div className="flex items-start gap-3 mb-4 pr-16">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <LayoutDashboard className="w-5 h-5 text-violet-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{dashboard.name}</h3>
                    {dashboard.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{dashboard.description}</p>
                    )}
                  </div>
                </div>

                {/* Widget count */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {dashboard.widgets.slice(0, 4).map(w => {
                      const catalog = WIDGET_CATALOG.find(c => c.type === w.type);
                      const Icon = catalog?.icon ?? BarChart3;
                      const colorClass = COLOR_MAP[catalog?.color ?? "blue"];
                      return (
                        <span key={w.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${colorClass}`}>
                          <Icon className="w-2.5 h-2.5" />
                          {w.title}
                        </span>
                      );
                    })}
                    {dashboard.widgets.length > 4 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                        +{dashboard.widgets.length - 4} more
                      </span>
                    )}
                    {dashboard.widgets.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">No widgets</span>
                    )}
                  </div>
                </div>

                {/* Meta */}
                <div className="text-[10px] text-muted-foreground mb-4">
                  Created {new Date(dashboard.created_at).toLocaleDateString()}
                  {" · "}{dashboard.widgets.length} widget{dashboard.widgets.length !== 1 ? "s" : ""}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditTarget(dashboard.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-medium transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => duplicateMutation.mutate({ id: dashboard.id })}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-medium transition-colors"
                    title="Duplicate"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDefaultMutation.mutate({ id: dashboard.id, isDefault: !dashboard.is_default })}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-xs font-medium transition-colors"
                    title={dashboard.is_default ? "Unset default" : "Set as default"}
                  >
                    {dashboard.is_default
                      ? <StarOff className="w-3.5 h-3.5 text-amber-500" />
                      : <Star className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${dashboard.name}"?`)) {
                        deleteMutation.mutate({ id: dashboard.id });
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-medium transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Widget Catalog Info */}
        <div className="bg-gradient-to-br from-violet-500/5 to-blue-500/5 border border-violet-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Settings2 className="w-5 h-5 text-violet-500" />
            <h3 className="text-sm font-semibold text-foreground">Available Widget Types</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {WIDGET_CATALOG.map(item => {
              const Icon = item.icon;
              const colorClass = COLOR_MAP[item.color];
              return (
                <div key={item.type} className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium ${colorClass}`}>
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{item.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <DashboardModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSaved={() => refetch()}
        />
      )}
      {editTarget !== null && editDashboard && (
        <DashboardModal
          mode="edit"
          initial={{
            id:          editDashboard.id,
            name:        editDashboard.name,
            description: editDashboard.description ?? "",
            widgets:     editDashboard.widgets,
            isDefault:   editDashboard.is_default,
          }}
          onClose={() => setEditTarget(null)}
          onSaved={() => refetch()}
        />
      )}
    </DashboardLayout>
  );
}
