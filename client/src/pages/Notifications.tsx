/**
 * Notifications Center — real data from Supabase via tRPC
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, BellOff, Check, CheckCheck, Trash2, AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import DashboardLayout from "@/components/DashboardLayout";

type NotifType = "info" | "warning" | "error" | "success";

const TYPE_CONFIG: Record<NotifType, { icon: React.ReactNode; color: string; bg: string }> = {
  info:    { icon: <Info className="h-4 w-4" />,          color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-950/30" },
  warning: { icon: <AlertTriangle className="h-4 w-4" />, color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-950/30" },
  error:   { icon: <XCircle className="h-4 w-4" />,       color: "text-red-600",     bg: "bg-red-50 dark:bg-red-950/30" },
  success: { icon: <CheckCircle className="h-4 w-4" />,   color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
};

export default function Notifications() {
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const utils = trpc.useUtils();

  const { data: notifications = [], isLoading } = trpc.notifications.list.useQuery({
    unreadOnly: activeTab === "unread",
    limit: 50,
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

  const displayed = activeTab === "unread"
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-header flex items-center gap-2">
              <Bell className="h-6 w-6 text-brand" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">{unreadCount}</Badge>
              )}
            </h1>
            <p className="page-subtitle">Stay updated on budget alerts, reports, and campaign changes.</p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="gap-2"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "unread")}>
          <TabsList>
            <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{unreadCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : displayed.length === 0 ? (
              <Card>
                <CardContent className="py-16">
                  <div className="empty-state">
                    <BellOff className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="font-medium text-foreground">
                      {activeTab === "unread" ? "No unread notifications" : "No notifications yet"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {activeTab === "unread"
                        ? "You're all caught up!"
                        : "Budget alerts, reports, and campaign updates will appear here."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {displayed.map((notif) => {
                  const type = (notif.type as NotifType) ?? "info";
                  const cfg  = TYPE_CONFIG[type] ?? TYPE_CONFIG.info;
                  return (
                    <Card
                      key={notif.id}
                      className={`transition-all ${!notif.is_read ? "border-brand/30 shadow-sm" : "opacity-80"}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Type icon */}
                          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.bg} ${cfg.color}`}>
                            {cfg.icon}
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className={`text-sm font-medium ${!notif.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                                  {notif.title}
                                  {!notif.is_read && (
                                    <span className="ml-2 inline-block h-2 w-2 rounded-full bg-brand align-middle" />
                                  )}
                                </p>
                                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                                  {notif.message}
                                </p>
                                <p className="text-xs text-muted-foreground/60 mt-1">
                                  {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                                </p>
                              </div>
                              {/* Actions */}
                              <div className="flex items-center gap-1 shrink-0">
                                {!notif.is_read && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    onClick={() => markRead.mutate({ notificationId: notif.id })}
                                    title="Mark as read"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => deleteNotif.mutate({ id: notif.id })}
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
