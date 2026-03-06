/**
 * publishing/components/MonthView.tsx — Monthly calendar grid view.
 */
import { useMemo } from "react";
import { Plus } from "lucide-react";
import type { CalendarPost } from "./types";
import { DAYS_SHORT, isSameDay, getPostDate } from "./types";
import { PostPill } from "./PostModals";

export function MonthView({ year, month, posts, onDayClick, onPostClick }: {
  year: number;
  month: number;
  posts: CalendarPost[];
  onDayClick: (date: Date) => void;
  onPostClick: (post: CalendarPost) => void;
}) {
  const today = new Date();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const totalCells = Math.ceil((startPad + lastDay.getDate()) / 7) * 7;

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - startPad + 1;
    if (dayNum < 1 || dayNum > lastDay.getDate()) return null;
    return new Date(year, month, dayNum);
  });

  const postsByDay = useMemo(() => {
    const map: Record<string, CalendarPost[]> = {};
    for (const post of posts) {
      const d = getPostDate(post);
      if (!d) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(post);
    }
    return map;
  }, [posts]);

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS_SHORT.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
        {cells.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} className="bg-card min-h-[90px]" />;
          const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          const dayPosts = postsByDay[key] ?? [];
          const isToday = isSameDay(date, today);
          const isPast = date < today && !isToday;

          return (
            <div key={key}
              className={`bg-card min-h-[90px] p-1.5 cursor-pointer hover:bg-muted/30 transition-colors group ${isPast ? "opacity-60" : ""}`}
              onClick={() => onDayClick(date)}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                }`}>{date.getDate()}</span>
                <Plus className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="space-y-0.5">
                {dayPosts.slice(0, 3).map(post => (
                  <PostPill key={post.id} post={post} onClick={() => onPostClick(post)} />
                ))}
                {dayPosts.length > 3 && (
                  <p className="text-[9px] text-muted-foreground pl-1">+{dayPosts.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
