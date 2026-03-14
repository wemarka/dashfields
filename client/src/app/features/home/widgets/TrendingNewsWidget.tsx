/**
 * TrendingNewsWidget — Upcoming events and holidays relevant to marketers.
 * Uses neutral palette with brand-red accent.
 */
import { CalendarDays, Gift, Star, Flame } from "lucide-react";

const EVENTS = [
  {
    icon: Gift,
    title: "Ramadan 2026",
    date: "Mar 17 – Apr 15",
    tag: "Seasonal",
    tagColor: "bg-muted text-foreground",
  },
  {
    icon: Star,
    title: "Mother's Day (US)",
    date: "May 10, 2026",
    tag: "Holiday",
    tagColor: "bg-brand/15 text-brand",
  },
  {
    icon: Flame,
    title: "Summer Sale Season",
    date: "Jun 1 – Jul 31",
    tag: "Peak",
    tagColor: "bg-brand/10 text-brand",
  },
  {
    icon: CalendarDays,
    title: "Black Friday",
    date: "Nov 27, 2026",
    tag: "Major",
    tagColor: "bg-neutral-700 text-neutral-300",
  },
];

export function TrendingNewsWidget() {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="w-4 h-4 text-brand" />
        <h2 className="text-sm font-semibold text-white">Trending & Upcoming</h2>
      </div>
      <div className="space-y-3">
        {EVENTS.map((event, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
              <event.icon className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-white truncate">
                  {event.title}
                </span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${event.tagColor}`}>
                  {event.tag}
                </span>
              </div>
              <span className="text-[11px] text-neutral-500">{event.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
