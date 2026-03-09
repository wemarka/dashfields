/**
 * client/src/core/lib/optimistic.ts
 *
 * Optimistic update helpers for tRPC mutations.
 * Each helper follows the onMutate/onError/onSettled pattern:
 *   1. onMutate: snapshot current cache, apply optimistic update
 *   2. onError: rollback to snapshot on failure
 *   3. onSettled: invalidate to sync with server
 *
 * NOTE: notifications.list now returns { items, nextCursor } for pagination.
 * Optimistic helpers update the `items` array inside the cached object.
 */

// ─── Type aliases ─────────────────────────────────────────────────────────────

type Utils = ReturnType<typeof import("@/core/lib/trpc").trpc.useUtils>;

type NotifPage = { items: { id: number; is_read: boolean; [key: string]: unknown }[]; nextCursor: string | null };

// ─── Notification: mark single notification as read ──────────────────────────

export function optimisticMarkNotificationRead(utils: Utils) {
  return {
    onMutate: async ({ notificationId }: { notificationId: number }) => {
      await utils.notifications.list.cancel();
      const previous = utils.notifications.list.getData();

      utils.notifications.list.setData(undefined, (old) => {
        if (!old) return old;
        const page = old as unknown as NotifPage;
        return {
          ...page,
          items: page.items.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n
          ),
        } as typeof old;
      });

      return { previous };
    },
    onError: (_err: unknown, _vars: unknown, ctx: { previous: unknown } | undefined) => {
      if (ctx?.previous !== undefined) {
        utils.notifications.list.setData(undefined, ctx.previous as never);
      }
    },
    onSettled: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  };
}

// ─── Notification: mark all notifications as read ────────────────────────────

export function optimisticMarkAllNotificationsRead(utils: Utils) {
  return {
    onMutate: async () => {
      await utils.notifications.list.cancel();
      const previous = utils.notifications.list.getData();

      utils.notifications.list.setData(undefined, (old) => {
        if (!old) return old;
        const page = old as unknown as NotifPage;
        return {
          ...page,
          items: page.items.map((n) => ({ ...n, is_read: true })),
        } as typeof old;
      });

      return { previous };
    },
    onError: (_err: unknown, _vars: unknown, ctx: { previous: unknown } | undefined) => {
      if (ctx?.previous !== undefined) {
        utils.notifications.list.setData(undefined, ctx.previous as never);
      }
    },
    onSettled: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  };
}

// ─── Notification: delete single notification ────────────────────────────────

export function optimisticDeleteNotification(utils: Utils) {
  return {
    onMutate: async ({ notificationId }: { notificationId: number }) => {
      await utils.notifications.list.cancel();
      const previous = utils.notifications.list.getData();

      utils.notifications.list.setData(undefined, (old) => {
        if (!old) return old;
        const page = old as unknown as NotifPage;
        return {
          ...page,
          items: page.items.filter((n) => n.id !== notificationId),
        } as typeof old;
      });

      return { previous };
    },
    onError: (_err: unknown, _vars: unknown, ctx: { previous: unknown } | undefined) => {
      if (ctx?.previous !== undefined) {
        utils.notifications.list.setData(undefined, ctx.previous as never);
      }
    },
    onSettled: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  };
}

// ─── Alert rule: delete ───────────────────────────────────────────────────────

export function optimisticDeleteAlert(utils: Utils) {
  type AlertList = Awaited<ReturnType<typeof utils.alerts.list.fetch>>;

  return {
    onMutate: async ({ id }: { id: number }) => {
      await utils.alerts.list.cancel();
      const previous = utils.alerts.list.getData();

      utils.alerts.list.setData(undefined, (old) => {
        if (!old) return old;
        return old.filter((a) => a.id !== id);
      });

      return { previous };
    },
    onError: (_err: unknown, _vars: unknown, ctx: { previous: AlertList | undefined } | undefined) => {
      if (ctx?.previous !== undefined) {
        utils.alerts.list.setData(undefined, ctx.previous);
      }
    },
    onSettled: () => {
      utils.alerts.list.invalidate();
    },
  };
}

// ─── Campaign: toggle status (ACTIVE ↔ PAUSED) ───────────────────────────────
// Campaigns are fetched with variable inputs (accountId, workspaceId, etc.)
// so we invalidate the entire meta.campaigns query family after mutation settles.
// The toggle component manages local optimistic state via useState for instant feedback.

export function optimisticToggleCampaignStatus(utils: Utils) {
  return {
    onMutate: async (_vars: { campaignId: string; status: string }) => {
      await utils.meta.campaigns.cancel();
      return {};
    },
    onError: () => {
      utils.meta.campaigns.invalidate();
    },
    onSettled: () => {
      utils.meta.campaigns.invalidate();
    },
  };
}
