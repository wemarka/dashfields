/**
 * client/src/core/lib/optimistic.ts
 *
 * Optimistic update helpers for tRPC mutations.
 * Each helper follows the onMutate/onError/onSettled pattern:
 *   1. onMutate: snapshot current cache, apply optimistic update
 *   2. onError: rollback to snapshot on failure
 *   3. onSettled: invalidate to sync with server
 *
 * Usage example:
 *   const markRead = trpc.notifications.markRead.useMutation(
 *     optimisticMarkNotificationRead(utils)
 *   );
 */

// ─── Type aliases ─────────────────────────────────────────────────────────────

type Utils = ReturnType<typeof import("@/core/lib/trpc").trpc.useUtils>;

// ─── Notification: mark single notification as read ──────────────────────────

export function optimisticMarkNotificationRead(utils: Utils) {
  type NotifList = Awaited<ReturnType<typeof utils.notifications.list.fetch>>;

  return {
    onMutate: async ({ notificationId }: { notificationId: number }) => {
      await utils.notifications.list.cancel();
      const previous = utils.notifications.list.getData();

      utils.notifications.list.setData(undefined, (old) => {
        if (!old) return old;
        return old.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        );
      });

      return { previous };
    },
    onError: (_err: unknown, _vars: unknown, ctx: { previous: NotifList | undefined } | undefined) => {
      if (ctx?.previous !== undefined) {
        utils.notifications.list.setData(undefined, ctx.previous);
      }
    },
    onSettled: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  };
}

// ─── Notification: mark all notifications as read ─────────────────────────────────────────────

export function optimisticMarkAllNotificationsRead(utils: Utils) {
  type NotifList = Awaited<ReturnType<typeof utils.notifications.list.fetch>>;

  return {
    onMutate: async () => {
      await utils.notifications.list.cancel();
      const previous = utils.notifications.list.getData();

      utils.notifications.list.setData(undefined, (old) => {
        if (!old) return old;
        return old.map((n) => ({ ...n, is_read: true }));
      });

      return { previous };
    },
    onError: (_err: unknown, _vars: unknown, ctx: { previous: NotifList | undefined } | undefined) => {
      if (ctx?.previous !== undefined) {
        utils.notifications.list.setData(undefined, ctx.previous);
      }
    },
    onSettled: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  };
}

// ─── Alert rule: delete ────────────────────────────────────────────────────────────────────────────────────────

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

// ─── Notification: delete single notification ───────────────────────────────────────────────────────────────────────────────────────────

export function optimisticDeleteNotification(utils: Utils) {
  type NotifList = Awaited<ReturnType<typeof utils.notifications.list.fetch>>;

  return {
    onMutate: async ({ notificationId }: { notificationId: number }) => {
      await utils.notifications.list.cancel();
      const previous = utils.notifications.list.getData();

      utils.notifications.list.setData(undefined, (old) => {
        if (!old) return old;
        return old.filter((n) => n.id !== notificationId);
      });

      return { previous };
    },
    onError: (_err: unknown, _vars: unknown, ctx: { previous: NotifList | undefined } | undefined) => {
      if (ctx?.previous !== undefined) {
        utils.notifications.list.setData(undefined, ctx.previous);
      }
    },
    onSettled: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  };
}
