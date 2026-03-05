/**
 * useRealtimeNotifications.ts
 * Subscribes to Supabase Realtime for the `notifications` table.
 * Calls `onNew` whenever a new row is inserted.
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/core/lib/supabase";

interface RealtimeNotification {
  id: number;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface Options {
  userId?: string;
  onNew: (notification: RealtimeNotification) => void;
}

export function useRealtimeNotifications({ userId, onNew }: Options) {
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;

  useEffect(() => {
    if (!supabase || !userId) return;

    const client = supabase;
    const channel = client
      .channel(`notifications:user:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onNewRef.current(payload.new as RealtimeNotification);
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [userId]);
}
