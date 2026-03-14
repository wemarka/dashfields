/**
 * client/src/app/components/NotificationBell.tsx
 *
 * Header notification bell with:
 * - Unread count badge with animation
 * - Supabase Realtime live push updates (no polling)
 * - Optimistic UI: mark-as-read, mark-all-read are instant
 * - Infinite scroll: loads more notifications on scroll
 * - Notification grouping: similar notifications collapsed into groups
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bell, CheckCircle2, AlertTriangle, Info, XCircle, X, Check, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
import { trpc } from "@/core/lib/trpc";
import { useAuth } from "@/shared/hooks/useAuth";
import { useRealtimeNotifications } from "@/shared/hooks/useRealtimeNotifications";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  optimisticMarkNotificationRead,
  optimisticMarkAllNotificationsRead,
} from "@/core/lib/optimistic";

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifRow = {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

type NotifGroup = {
  key: string;          // type + title hash
  type: string;
  title: string;
  items: NotifRow[];
  unreadCount: number;
  latest: NotifRow;
};

// ─── Icon map ─────────────────────────────────────────────────────────────────

const TYPE_ICONS = {
  info:    <Info className="h-3.5 w-3.5 text-muted-foreground" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />,
  error:   <XCircle className="h-3.5 w-3.5 text-brand" />,
  success: <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />,
};

const PAGE_SIZE = 15;

// ─── Grouping helper ──────────────────────────────────────────────────────────

function groupNotifications(items: NotifRow[]): NotifGroup[] {
  const map = new Map<string, NotifGroup>();
  for (const n of items) {
    const key = `${n.type}::${n.title}`;
    if (!map.has(key)) {
      map.set(key, { key, type: n.type, title: n.title, items: [], unreadCount: 0, latest: n });
    }
    const g = map.get(key)!;
    g.items.push(n);
    if (!n.is_read) g.unreadCount++;
    if (new Date(n.created_at) > new Date(g.latest.created_at)) g.latest = n;
  }
  // Sort groups: unread first, then by latest created_at desc
  return Array.from(map.values()).sort((a, b) => {
    if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
    return new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime();
  });
}

// ─── GroupRow component ───────────────────────────────────────────────────────

function GroupRow({ group, onMarkRead }: {
  group: NotifGroup;
  onMarkRead: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isMulti = group.items.length > 1;

  return (
    <div className="border-b border-[#f0f0f0] last:border-0">
      {/* Group header */}
      <div
        className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer ${
          group.unreadCount > 0 ? "bg-brand/5 hover:bg-brand/8" : "hover:bg-foreground/[0.03]"
        }`}
        onClick={() => isMulti && setExpanded((e) => !e)}
      >
        <div className="mt-0.5 shrink-0">
          {TYPE_ICONS[group.type as keyof typeof TYPE_ICONS] ?? TYPE_ICONS.info}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium text-foreground line-clamp-1 flex-1">{group.title}</p>
            {/* Group count badge */}
            {isMulti && (
              <span className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-foreground/10 text-[10px] font-semibold text-foreground/60">
                {group.items.length}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{group.latest.message}</p>
          <p className="text-xs text-muted-foreground/50 mt-1">
            {new Date(group.latest.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Unread dot for single items */}
          {!isMulti && group.unreadCount > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onMarkRead(group.items[0].id); }}
              className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 hover:bg-brand/80 transition-colors"
              title="Mark as read"
            />
          )}
          {/* Unread count for groups */}
          {isMulti && group.unreadCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-[10px] font-bold text-white">
              {group.unreadCount}
            </span>
          )}
          {/* Expand/collapse chevron */}
          {isMulti && (
            <span className="text-muted-foreground/50 ml-1">
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </span>
          )}
        </div>
      </div>

      {/* Expanded individual items */}
      {expanded && isMulti && (
        <div className="bg-foreground/[0.02] border-t border-[#f0f0f0]">
          {group.items.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 pl-10 pr-4 py-2.5 border-b border-[#f0f0f0] last:border-0 transition-colors ${
                !n.is_read ? "bg-brand/5" : "hover:bg-foreground/[0.03]"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {!n.is_read && (
                <button
                  onClick={() => onMarkRead(n.id)}
                  className="shrink-0 w-1.5 h-1.5 rounded-full bg-brand mt-1.5 hover:bg-brand/80 transition-colors"
                  title="Mark as read"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen]         = useState(false);
  const [newBadge, setNewBadge] = useState(false);
  const [cursor, setCursor]     = useState<string | undefined>(undefined);
  const [allItems, setAllItems] = useState<NotifRow[]>([]);
  const [hasMore, setHasMore]   = useState(false);
  const ref                     = useRef<HTMLDivElement>(null);
  const scrollRef               = useRef<HTMLDivElement>(null);
  const sentinelRef             = useRef<HTMLDivElement>(null);
  const [, setLocation]         = useLocation();
  const utils                   = trpc.useUtils();
  const { user }                = useAuth();

  // ── Data — first page ─────────────────────────────────────────────────────
  const { data: page, isFetching } = trpc.notifications.list.useQuery(
    { limit: PAGE_SIZE },
    { staleTime: 30_000 }
  );

  // ── Data — load-more page (only when cursor is set) ───────────────────────
  const { data: morePage, isFetching: isFetchingMore } = trpc.notifications.list.useQuery(
    { limit: PAGE_SIZE, cursor },
    { enabled: !!cursor, staleTime: 0 }
  );

  // Sync first page into allItems
  useEffect(() => {
    if (!page) return;
    const items = (page as { items: NotifRow[]; nextCursor: string | null }).items ?? [];
    const next  = (page as { items: NotifRow[]; nextCursor: string | null }).nextCursor ?? null;
    setAllItems(items);
    setHasMore(!!next);
    setCursor(undefined);
  }, [page]);

  // Append more items when a load-more page arrives
  useEffect(() => {
    if (!morePage || !cursor) return;
    const items = (morePage as { items: NotifRow[]; nextCursor: string | null }).items ?? [];
    const next  = (morePage as { items: NotifRow[]; nextCursor: string | null }).nextCursor ?? null;
    setAllItems((prev) => {
      const existingIds = new Set(prev.map((n) => n.id));
      return [...prev, ...items.filter((n) => !existingIds.has(n.id))];
    });
    setHasMore(!!next);
  }, [morePage, cursor]);

  // ── Mutations with Optimistic UI ──────────────────────────────────────────
  const markRead = trpc.notifications.markRead.useMutation(
    optimisticMarkNotificationRead(utils)
  );

  const markAllRead = trpc.notifications.markAllRead.useMutation(
    optimisticMarkAllNotificationsRead(utils)
  );

  // ── Supabase Realtime subscription ────────────────────────────────────────
  useRealtimeNotifications({
    userId: user?.id?.toString(),
    onNew: (n) => {
      utils.notifications.list.invalidate();
      setNewBadge(true);
      setTimeout(() => setNewBadge(false), 2000);

      const icon = TYPE_ICONS[n.type as keyof typeof TYPE_ICONS] ?? TYPE_ICONS.info;
      toast.custom(
        () => (
          <div className="flex items-start gap-3 bg-neutral-900/90 backdrop-blur-xl border border-white/30 rounded-2xl px-4 py-3 shadow-lg max-w-sm">
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

  // ── Derived state ─────────────────────────────────────────────────────────
  const unreadCount = allItems.filter((n) => !n.is_read).length;
  const groups = groupNotifications(allItems);

  // ── IntersectionObserver for infinite scroll ──────────────────────────────
  const loadMore = useCallback(() => {
    if (!hasMore || isFetchingMore || isFetching) return;
    const lastItem = allItems[allItems.length - 1];
    if (lastItem) setCursor(lastItem.created_at);
  }, [hasMore, isFetchingMore, isFetching, allItems]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { root: scrollRef.current, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleMarkAllRead() {
    if (unreadCount === 0) return;
    markAllRead.mutate(undefined);
  }

  function handleMarkOneRead(notificationId: number) {
    markRead.mutate({ notificationId });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-8 h-8 rounded-lg flex items-center justify-center text-foreground/40 hover:text-foreground/70 transition-colors"
        title="Notifications"
      >
        <Bell className={`w-[18px] h-[18px] transition-transform ${newBadge ? "scale-125" : ""}`} />
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
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-lg overflow-hidden z-50"
          style={{ background: "#ffffff", border: "1px solid #ebebeb" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#ebebeb]">
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
                  onClick={handleMarkAllRead}
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

          {/* Grouped notification list */}
          <div ref={scrollRef} className="max-h-80 overflow-y-auto">
            {groups.length === 0 && !isFetching ? (
              <div className="py-8 text-center text-muted-foreground">
                <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No notifications yet</p>
              </div>
            ) : (
              <>
                {groups.map((group) => (
                  <GroupRow
                    key={group.key}
                    group={group}
                    onMarkRead={handleMarkOneRead}
                  />
                ))}

                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} className="h-1" />

                {/* Loading more indicator */}
                {isFetchingMore && (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* Manual load more fallback */}
                {hasMore && !isFetchingMore && (
                  <button
                    onClick={loadMore}
                    className="w-full py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors hover:bg-foreground/[0.03]"
                  >
                    Load more
                  </button>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {allItems.length > 0 && (
            <div className="px-4 py-2.5 border-t border-[#ebebeb] flex items-center justify-between">
              <button
                onClick={() => { setOpen(false); setLocation("/alerts"); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View all in Alerts →
              </button>
              <span className="text-xs text-muted-foreground/50 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand inline-block" />
                Live
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
