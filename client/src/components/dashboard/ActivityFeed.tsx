/**
 * ActivityFeed.tsx
 * Real-time activity feed using Supabase Realtime.
 * Shows latest events: new posts, budget alerts, reports, campaign changes.
 */
import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  FileText, DollarSign, Bell, BarChart2, Calendar,
  CheckCircle2, AlertTriangle, Info, Zap,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ActivityEvent {
  id: string;
  type: "post" | "budget" | "report" | "campaign" | "alert" | "system";
  title: string;
  description: string;
  timestamp: Date;
  severity?: "info" | "warning" | "success" | "error";
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const ICONS: Record<ActivityEvent["type"], React.ElementType> = {
  post:     FileText,
  budget:   DollarSign,
  report:   BarChart2,
  campaign: Zap,
  alert:    Bell,
  system:   Info,
};

const SEVERITY_STYLES: Record<string, string> = {
  info:    "bg-blue-500/10 text-blue-500",
  warning: "bg-amber-500/10 text-amber-500",
  success: "bg-emerald-500/10 text-emerald-500",
  error:   "bg-red-500/10 text-red-500",
};

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function buildEventsFromPost(row: Record<string, unknown>): ActivityEvent {
  const platforms = Array.isArray(row.platforms) ? row.platforms.join(", ") : String(row.platforms ?? "");
  return {
    id:          `post-${row.id}-${Date.now()}`,
    type:        "post",
    title:       row.status === "published" ? "Post Published" : row.status === "scheduled" ? "Post Scheduled" : "Draft Saved",
    description: `${platforms ? `[${platforms}] ` : ""}${String(row.content ?? "").slice(0, 60)}${String(row.content ?? "").length > 60 ? "…" : ""}`,
    timestamp:   new Date(String(row.updated_at ?? row.created_at ?? Date.now())),
    severity:    row.status === "published" ? "success" : row.status === "failed" ? "error" : "info",
  };
}

function buildEventsFromNotification(row: Record<string, unknown>): ActivityEvent {
  const typeMap: Record<string, ActivityEvent["type"]> = {
    info: "system", warning: "alert", error: "alert", success: "system",
  };
  return {
    id:          `notif-${row.id}-${Date.now()}`,
    type:        typeMap[String(row.type ?? "info")] ?? "system",
    title:       String(row.title ?? "Notification"),
    description: String(row.message ?? "").slice(0, 80),
    timestamp:   new Date(String(row.created_at ?? Date.now())),
    severity:    (row.type as ActivityEvent["severity"]) ?? "info",
  };
}

// ─── Component ─────────────────────────────────────────────────────────────────
interface ActivityFeedProps {
  userId: number;
  maxItems?: number;
}

export default function ActivityFeed({ userId, maxItems = 8 }: ActivityFeedProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    const sb = createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    );

    // ── Initial load ──────────────────────────────────────────────────────────
    async function loadInitial() {
      setLoading(true);
      const initial: ActivityEvent[] = [];

      // Recent posts
      const { data: posts } = await sb
        .from("posts")
        .select("id, content, platforms, status, updated_at, created_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(5);

      (posts ?? []).forEach(p => initial.push(buildEventsFromPost(p as Record<string, unknown>)));

      // Recent notifications
      const { data: notifs } = await sb
        .from("notifications")
        .select("id, title, message, type, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      (notifs ?? []).forEach(n => initial.push(buildEventsFromNotification(n as Record<string, unknown>)));

      // Sort by timestamp desc
      initial.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setEvents(initial.slice(0, maxItems));
      setLoading(false);
    }

    loadInitial();

    // ── Realtime subscriptions ────────────────────────────────────────────────
    const channel = sb.channel(`activity-feed-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as Record<string, unknown>;
          if (!row) return;
          const ev = buildEventsFromPost(row);
          setEvents(prev => [ev, ...prev].slice(0, maxItems));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (!row) return;
          const ev = buildEventsFromNotification(row);
          setEvents(prev => [ev, ...prev].slice(0, maxItems));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      sb.removeChannel(channel);
    };
  }, [userId, maxItems]);

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-muted rounded w-2/3" />
              <div className="h-2.5 bg-muted rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle2 className="w-8 h-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No recent activity</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Events will appear here in real-time</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {events.map((ev, idx) => {
        const Icon = ICONS[ev.type] ?? Info;
        const severityStyle = SEVERITY_STYLES[ev.severity ?? "info"];
        return (
          <div
            key={ev.id}
            className={`flex items-start gap-3 p-2.5 rounded-xl transition-colors hover:bg-muted/40 ${idx === 0 ? "bg-muted/20" : ""}`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${severityStyle}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground truncate">{ev.title}</p>
                <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(ev.timestamp)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{ev.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
