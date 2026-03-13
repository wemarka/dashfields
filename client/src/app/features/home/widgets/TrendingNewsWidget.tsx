/**
 * TrendingNewsWidget — Upcoming events and holidays relevant to marketers.
 */
import { CalendarDays, Gift, Star, Flame } from "lucide-react";

const EVENTS = [
  {
    icon: Gift,
    title: "Ramadan 2026",
    date: "Mar 17 – Apr 15",
    tag: "Seasonal",
    tagColor: "bg-emerald-500/15 text-emerald-400",
  },
  {
    icon: Star,
    title: "Mother's Day (US)",
    date: "May 10, 2026",
    tag: "Holiday",
    tagColor: "bg-pink-500/15 text-pink-400",
  },
  {
    icon: Flame,
    title: "Summer Sale Season",
    date: "Jun 1 – Jul 31",
    tag: "Peak",
    tagColor: "bg-amber-500/15 text-amber-400",
  },
  {
    icon: CalendarDays,
    title: "Black Friday",
    date: "Nov 27, 2026",
    tag: "Major",
    tagColor: "bg-violet-500/15 text-violet-400",
  },
];

export function TrendingNewsWidget() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="w-4 h-4 text-amber-400" />
        <h2 className="text-sm font-semibold text-foreground">Trending & Upcoming</h2>
      </div>
      <div className="space-y-3">
        {EVENTS.map((event, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.03] transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
              <event.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-foreground truncate">
                  {event.title}
                </span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${event.tagColor}`}>
                  {event.tag}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">{event.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
