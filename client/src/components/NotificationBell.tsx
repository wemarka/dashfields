/**
 * NotificationBell.tsx
 * Header notification bell with unread count badge and dropdown panel.
 * Uses Supabase Realtime for live push updates — no polling needed.
 */
import { useState, useRef, useEffect } from "react";
import { Bell, CheckCircle2, AlertTriangle, Info, XCircle, X, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useLocation } from "wouter";
import { toast } from "sonner";

const TYPE_ICONS = {
  info:    <Info className="h-3.5 w-3.5 text-blue-500" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
  error:   <XCircle className="h-3.5 w-3.5 text-red-500" />,
  success: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [newBadge, setNewBadge] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { user } = useAuth();

  const { data: notifications = [] } = trpc.notifications.list.useQuery();

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  // ── Supabase Realtime subscription ─────────────────────────────────────────
  useRealtimeNotifications({
    userId: user?.id?.toString(),
    onNew: (n) => {
      // Refresh the list from server
      utils.notifications.list.invalidate();
      // Animate badge
      setNewBadge(true);
      setTimeout(() => setNewBadge(false), 2000);
      // Show toast
      const icon = TYPE_ICONS[n.type as keyof typeof TYPE_ICONS] ?? TYPE_ICONS.info;
      toast.custom(
        () => (
          <div className="flex items-start gap-3 bg-white/90 backdrop-blur-xl border border-white/30 rounded-2xl px-4 py-3 shadow-lg max-w-sm">
            <div className="mt-0.5 shrink-0">{icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">{n.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
            </div>
          </div>
        ),
        { duration: 4000 }
      );
    },
  });

  const unread = notifications.filter((n) => !n.is_read);
  const unreadCount = unread.length;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-8 h-8 rounded-xl flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors"
        title="Notifications"
      >
        <Bell className={`w-4 h-4 transition-transform ${newBadge ? "scale-125" : ""}`} />
        {unreadCount > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none transition-transform ${newBadge ? "scale-125" : ""}`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 glass-strong rounded-2xl shadow-xl border border-white/20 overflow-hidden z-50 animate-blur-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-foreground/60" />
              <span className="text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => unread.forEach((n) => markRead.mutate({ notificationId: n.id }))}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-foreground/5"
                  title="Mark all as read"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-foreground/5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors ${!n.is_read ? "bg-amber-500/5" : "hover:bg-foreground/3"}`}
                >
                  <div className="mt-0.5 shrink-0">
                    {TYPE_ICONS[n.type as keyof typeof TYPE_ICONS] ?? TYPE_ICONS.info}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground line-clamp-1">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={() => markRead.mutate({ notificationId: n.id })}
                      className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 hover:bg-blue-700 transition-colors"
                      title="Mark as read"
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() => { setOpen(false); setLocation("/alerts"); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View all in Alerts →
              </button>
              <span className="text-xs text-muted-foreground/50 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Live
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
