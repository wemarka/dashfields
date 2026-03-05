// Notifications.tsx
// Advanced Notifications Center — smart alerts, category filtering, bulk actions, and preferences.
import { useState, useMemo } from "react";
import { trpc } from "@/core/lib/trpc";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { toast } from "sonner";
import DashboardLayout from "@/app/components/DashboardLayout";
import { formatDistanceToNow } from "date-fns";
import {
  Bell, BellOff, Check, CheckCheck, Trash2, AlertTriangle, Info,
  CheckCircle, XCircle, Search, RefreshCw, Settings2,
  TrendingDown, DollarSign, Zap, BarChart3, Clock, Star,
  X, Mail, Smartphone,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
type NotifType = "info" | "warning" | "error" | "success";
type NotifCategory = "all" | "budget" | "campaign" | "report" | "system";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: NotifType;
  is_read: boolean;
  created_at: string;
}

const TYPE_CONFIG: Record<NotifType, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  info:    { icon: <Info className="h-4 w-4" />,          color: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-500/10",    label: "Info"    },
  warning: { icon: <AlertTriangle className="h-4 w-4" />, color: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-500/10",   label: "Warning" },
  error:   { icon: <XCircle className="h-4 w-4" />,       color: "text-red-600 dark:text-red-400",         bg: "bg-red-500/10",     label: "Alert"   },
  success: { icon: <CheckCircle className="h-4 w-4" />,   color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", label: "Success" },
};

const CATEGORY_KEYWORDS: Record<Exclude<NotifCategory, "all">, string[]> = {
  budget:   ["budget", "spend", "cost", "overspend", "limit"],
  campaign: ["campaign", "ad", "roas", "ctr", "impression", "click"],
  report:   ["report", "scheduled", "generated", "export"],
  system:   ["system", "connected", "disconnected", "token", "oauth"],
};

function detectCategory(title: string, message: string): NotifCategory {
  const text = `${title} ${message}`.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) return cat as NotifCategory;
  }
  return "system";
}

// ─── Smart Alert Card ──────────────────────────────────────────────────────────
function SmartAlertCard({ title, description, icon: Icon, colorClass }: {
  title: string;
  description: string;
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${colorClass}`}>
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div>
        <div className="text-xs font-semibold">{title}</div>
        <div className="text-[11px] opacity-70 mt-0.5">{description}</div>
      </div>
    </div>
  );
}

// ─── Notification Item ─────────────────────────────────────────────────────────
function NotificationItem({
  notif, selected, onSelect, onMarkRead, onDelete,
}: {
  notif: Notification;
  selected: boolean;
  onSelect: (id: number) => void;
  onMarkRead: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const type = (notif.type as NotifType) ?? "info";
  const cfg  = TYPE_CONFIG[type] ?? TYPE_CONFIG.info;
  const category = detectCategory(notif.title, notif.message);

  const categoryIcons: Record<NotifCategory, React.ElementType> = {
    all: Bell, budget: DollarSign, campaign: BarChart3, report: Star, system: Zap,
  };
  const CategoryIcon = categoryIcons[category];

  return (
    <div className={`group flex items-start gap-3 p-4 rounded-xl border transition-all ${
      !notif.is_read ? "border-primary/20 bg-primary/[0.03] shadow-sm" : "border-border bg-card hover:bg-muted/30"
    } ${selected ? "ring-2 ring-primary/30" : ""}`}>
      {/* Checkbox */}
      <button
        onClick={() => onSelect(notif.id)}
        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
          selected ? "bg-primary border-primary" : "border-border hover:border-primary/50"
        }`}
      >
        {selected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
      </button>

      {/* Type icon */}
      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cfg.bg} ${cfg.color}`}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`text-sm font-semibold ${!notif.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                {notif.title}
              </p>
              {!notif.is_read && (
                <span className="inline-block h-2 w-2 rounded-full bg-primary flex-shrink-0" />
              )}
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${cfg.bg} ${cfg.color}`}>
                <CategoryIcon className="w-2.5 h-2.5" />
                {category}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{notif.message}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
              </span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {!notif.is_read && (
              <button
                onClick={() => onMarkRead(notif.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title="Mark as read"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onDelete(notif.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Notifications() {
  usePageTitle("Notifications");
  const [filter,      setFilter]      = useState<"all" | "unread">("all");
  const [category,    setCategory]    = useState<NotifCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showPrefs,   setShowPrefs]   = useState(false);
  const [emailDigest, setEmailDigest] = useState(true);
  const [pushAlerts,  setPushAlerts]  = useState(true);

  const utils = trpc.useUtils();

  const { data: notifications = [], isLoading, refetch } = trpc.notifications.list.useQuery({
    unreadOnly: filter === "unread",
    limit: 100,
  });
  const { data: unreadData } = trpc.notifications.unreadCount.useQuery();
  const unreadCount = unreadData?.count ?? 0;

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
      toast.success("All notifications marked as read");
    },
  });
  const deleteNotif = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  // ── Filtered list ──────────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    let list = notifications as Notification[];
    if (filter === "unread") list = list.filter(n => !n.is_read);
    if (category !== "all") list = list.filter(n => detectCategory(n.title, n.message) === category);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(n => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q));
    }
    return list;
  }, [notifications, filter, category, searchQuery]);

  // ── Category counts ────────────────────────────────────────────────────────
  const categoryCounts = useMemo(() => {
    const counts: Record<NotifCategory, number> = { all: 0, budget: 0, campaign: 0, report: 0, system: 0 };
    (notifications as Notification[]).forEach(n => {
      counts.all++;
      const cat = detectCategory(n.title, n.message);
      counts[cat]++;
    });
    return counts;
  }, [notifications]);

  // ── Bulk actions ───────────────────────────────────────────────────────────
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAll = () => {
    if (selectedIds.size === displayed.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayed.map(n => n.id)));
  };
  const bulkMarkRead = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      const notif = (notifications as Notification[]).find(n => n.id === id);
      if (notif && !notif.is_read) await markRead.mutateAsync({ notificationId: id });
    }
    const count = ids.length;
    setSelectedIds(new Set());
    toast.success(`${count} notifications marked as read`);
  };
  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) await deleteNotif.mutateAsync({ id });
    const count = ids.length;
    setSelectedIds(new Set());
    toast.success(`${count} notifications deleted`);
  };

  const CATEGORIES: { id: NotifCategory; label: string; icon: React.ElementType }[] = [
    { id: "all",      label: "All",      icon: Bell       },
    { id: "budget",   label: "Budget",   icon: DollarSign },
    { id: "campaign", label: "Campaign", icon: BarChart3  },
    { id: "report",   label: "Reports",  icon: Star       },
    { id: "system",   label: "System",   icon: Zap        },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              Notifications
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Budget alerts, campaign updates, and system events.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowPrefs(v => !v)}
              className={`p-2 rounded-lg transition-colors ${showPrefs ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"}`}
              title="Preferences"
            >
              <Settings2 className="w-4 h-4" />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Preferences Panel */}
        {showPrefs && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" />
                Notification Preferences
              </h3>
              <button onClick={() => setShowPrefs(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Toggles */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Email Digest", desc: "Daily summary email", icon: Mail, color: "text-blue-500", state: emailDigest, toggle: () => setEmailDigest(v => !v) },
                { label: "Push Alerts",  desc: "Real-time notifications", icon: Smartphone, color: "text-green-500", state: pushAlerts, toggle: () => setPushAlerts(v => !v) },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
                  <div className="flex items-center gap-2">
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                    <div>
                      <div className="text-xs font-medium text-foreground">{item.label}</div>
                      <div className="text-[10px] text-muted-foreground">{item.desc}</div>
                    </div>
                  </div>
                  <button
                    onClick={item.toggle}
                    className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${item.state ? "bg-primary" : "bg-border"}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${item.state ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </div>
              ))}
            </div>
            {/* Smart alert types */}
            <div className="grid grid-cols-2 gap-3">
              <SmartAlertCard title="Budget Overspend Alert" description="Triggered when daily spend exceeds 110% of limit" icon={DollarSign} colorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" />
              <SmartAlertCard title="ROAS Drop Alert" description="Triggered when ROAS falls below 2.0x" icon={TrendingDown} colorClass="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" />
              <SmartAlertCard title="Campaign Milestone" description="Triggered at 50%, 75%, 100% of budget" icon={BarChart3} colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" />
              <SmartAlertCard title="Scheduled Report Ready" description="Triggered when a scheduled report is generated" icon={Star} colorClass="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" />
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const count = categoryCounts[cat.id];
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  category === cat.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${category === cat.id ? "bg-white/20" : "bg-border"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
            {(["all", "unread"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "unread" ? `Unread (${unreadCount})` : "All"}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
            <span className="text-sm font-medium text-primary">{selectedIds.size} selected</span>
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={bulkMarkRead} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                <Check className="w-3.5 h-3.5" /> Mark read
              </button>
              <button onClick={bulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-xs font-medium hover:bg-red-500/20 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-muted/20">
            <BellOff className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">
              {filter === "unread" ? "No unread notifications" : "No notifications"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {filter === "unread" ? "You're all caught up!" : "Budget alerts and campaign updates will appear here."}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-1">
              <button onClick={selectAll} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  selectedIds.size === displayed.length && displayed.length > 0 ? "bg-primary border-primary" : "border-border"
                }`}>
                  {selectedIds.size === displayed.length && displayed.length > 0 && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                </div>
                Select all ({displayed.length})
              </button>
              <span className="text-xs text-muted-foreground ml-auto">
                {displayed.length} notification{displayed.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-2">
              {displayed.map(notif => (
                <NotificationItem
                  key={notif.id}
                  notif={notif as Notification}
                  selected={selectedIds.has(notif.id)}
                  onSelect={toggleSelect}
                  onMarkRead={id => markRead.mutate({ notificationId: id })}
                  onDelete={id => deleteNotif.mutate({ id })}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
