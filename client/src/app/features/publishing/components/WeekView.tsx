/**
 * publishing/components/WeekView.tsx — Weekly time-grid view with drag-and-drop.
 */
import React, { useState } from "react";
import { Plus } from "lucide-react";
import type { CalendarPost } from "./types";
import { DAYS_SHORT, STATUS_STYLES, isSameDay, getPostDate } from "./types";

export function WeekView({ weekStart, posts, onDayClick, onPostClick, onReschedule }: {
  weekStart: Date;
  posts: CalendarPost[];
  onDayClick: (date: Date) => void;
  onPostClick: (post: CalendarPost) => void;
  onReschedule?: (postId: number, newDate: Date) => void;
}) {
  const today = new Date();
  const [dragPostId, setDragPostId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

  const getPostHour = (post: CalendarPost): number | null => {
    const d = getPostDate(post);
    return d ? d.getHours() : null;
  };

  const handleDragStart = (e: React.DragEvent, postId: number) => {
    setDragPostId(postId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, slotKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(slotKey);
  };

  const handleDrop = (e: React.DragEvent, date: Date, hour: number) => {
    e.preventDefault();
    setDropTarget(null);
    if (dragPostId == null || !onReschedule) return;
    const newDate = new Date(date);
    newDate.setHours(hour, 0, 0, 0);
    onReschedule(dragPostId, newDate);
    setDragPostId(null);
  };

  return (
    <div className="overflow-auto" style={{ maxHeight: "70vh" }}>
      {/* Day headers */}
      <div className="grid gap-0 sticky top-0 z-10 bg-background" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
        <div className="h-10" />
        {days.map(date => {
          const isToday = isSameDay(date, today);
          return (
            <div key={date.toISOString()} className="h-10 flex flex-col items-center justify-center border-b border-border">
              <p className="text-[10px] font-medium text-muted-foreground">{DAYS_SHORT[date.getDay()]}</p>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold leading-none ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="grid" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
        {HOURS.map(hour => (
          <React.Fragment key={hour}>
            <div className="h-14 flex items-start justify-end pr-2 pt-1">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </span>
            </div>
            {days.map(date => {
              const slotKey = `${date.toDateString()}-${hour}`;
              const slotPosts = posts.filter(p => {
                const d = getPostDate(p);
                return d && isSameDay(d, date) && getPostHour(p) === hour;
              });
              const isDropTargetSlot = dropTarget === slotKey;
              const isToday = isSameDay(date, today);

              return (
                <div key={slotKey}
                  className={`h-14 border-b border-r border-border/40 relative transition-colors cursor-pointer
                    ${isDropTargetSlot ? "bg-primary/10 border-primary/40" : isToday ? "bg-primary/3" : "hover:bg-muted/30"}`}
                  onClick={() => { const d = new Date(date); d.setHours(hour, 0, 0, 0); onDayClick(d); }}
                  onDragOver={(e) => handleDragOver(e, slotKey)}
                  onDragLeave={() => setDropTarget(null)}
                  onDrop={(e) => handleDrop(e, date, hour)}>
                  {slotPosts.map(post => {
                    const style = STATUS_STYLES[post.status] ?? STATUS_STYLES.draft;
                    return (
                      <div key={post.id} draggable
                        onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, post.id); }}
                        onClick={(e) => { e.stopPropagation(); onPostClick(post); }}
                        className={`absolute inset-x-0.5 top-0.5 bottom-0.5 rounded px-1 py-0.5 cursor-grab active:cursor-grabbing
                          ${style.bg} ${style.text} text-[10px] font-medium overflow-hidden
                          ${dragPostId === post.id ? "opacity-50 ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/50"} transition-all`}
                        title={post.content.slice(0, 80)}>
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                          <span className="truncate">{post.title ?? post.content.slice(0, 30)}</span>
                        </div>
                        {post.platforms.slice(0, 2).map(p => (
                          <span key={p} className="capitalize text-[9px] opacity-70">{p} </span>
                        ))}
                      </div>
                    );
                  })}
                  {isDropTargetSlot && slotPosts.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Plus className="w-3.5 h-3.5 text-primary opacity-60" />
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
