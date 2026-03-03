// PostCalendarView.tsx
// Monthly calendar grid showing scheduled posts.

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

interface Post {
  id: number;
  title?: string | null;
  content: string;
  scheduled_at?: string | number | null;
}

interface PostCalendarViewProps {
  posts: Post[];
  month: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export function PostCalendarView({ posts, month, onPrevMonth, onNextMonth }: PostCalendarViewProps) {
  const firstDay    = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const calCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Group posts by day of month
  const postsByDay: Record<number, Post[]> = {};
  posts.forEach((p) => {
    const d = p.scheduled_at ? new Date(p.scheduled_at) : null;
    if (d && d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear()) {
      const day = d.getDate();
      postsByDay[day] = [...(postsByDay[day] ?? []), p];
    }
  });

  const today = new Date();

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-foreground/5">
        <button
          onClick={onPrevMonth}
          className="p-1.5 rounded-lg hover:bg-foreground/8 transition-colors text-muted-foreground hover:text-foreground text-lg leading-none"
        >
          ‹
        </button>
        <h3 className="text-sm font-semibold">
          {MONTHS[month.getMonth()]} {month.getFullYear()}
        </h3>
        <button
          onClick={onNextMonth}
          className="p-1.5 rounded-lg hover:bg-foreground/8 transition-colors text-muted-foreground hover:text-foreground text-lg leading-none"
        >
          ›
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-foreground/5">
        {DAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calCells.map((day, i) => {
          const isToday =
            day === today.getDate() &&
            month.getMonth() === today.getMonth() &&
            month.getFullYear() === today.getFullYear();
          const dayPosts = day ? (postsByDay[day] ?? []) : [];

          return (
            <div
              key={i}
              className={
                "min-h-[80px] p-2 border-b border-r border-foreground/5 " +
                (i % 7 === 6 ? "border-r-0" : "") +
                (!day ? " bg-foreground/1" : " hover:bg-foreground/2 transition-colors cursor-pointer")
              }
            >
              {day && (
                <>
                  <span
                    className={
                      "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full " +
                      (isToday ? "bg-foreground text-background" : "text-muted-foreground")
                    }
                  >
                    {day}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayPosts.slice(0, 2).map((p) => (
                      <div
                        key={p.id}
                        className="text-xs px-1.5 py-0.5 rounded bg-foreground/8 text-foreground/70 truncate"
                      >
                        {p.title ?? p.content?.slice(0, 20)}
                      </div>
                    ))}
                    {dayPosts.length > 2 && (
                      <div className="text-xs text-muted-foreground px-1">+{dayPosts.length - 2} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
