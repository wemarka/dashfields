import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { Plus, Calendar, Clock, Image, FileText, Video, ChevronLeft, ChevronRight } from "lucide-react";

const posts = [
  { id: 1, title: "Summer Collection Launch",  platform: "Instagram", type: "image",  status: "scheduled", date: "Mar 5, 2026",  time: "10:00 AM" },
  { id: 2, title: "Behind the Scenes Video",   platform: "Meta",      type: "video",  status: "draft",     date: "Mar 7, 2026",  time: "2:00 PM"  },
  { id: 3, title: "Customer Testimonial",      platform: "Instagram", type: "image",  status: "published", date: "Mar 1, 2026",  time: "9:00 AM"  },
  { id: 4, title: "Product Feature Highlight", platform: "Meta",      type: "text",   status: "scheduled", date: "Mar 10, 2026", time: "12:00 PM" },
  { id: 5, title: "Weekly Tips Thread",        platform: "Meta",      type: "text",   status: "draft",     date: "Mar 12, 2026", time: "11:00 AM" },
  { id: 6, title: "Flash Sale Announcement",   platform: "Instagram", type: "image",  status: "scheduled", date: "Mar 15, 2026", time: "8:00 AM"  },
];

const typeIcon = { image: Image, video: Video, text: FileText };
const statusStyle: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700",
  draft:      "bg-slate-100 text-slate-600",
  published:  "bg-emerald-50 text-emerald-700",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Publishing() {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [month] = useState("March 2026");

  // Build a simple 5-week calendar grid for March 2026
  // March 1 is Sunday (day index 0)
  const calDays = Array.from({ length: 35 }, (_, i) => {
    const day = i - 0 + 1; // March starts on Sunday
    return day >= 1 && day <= 31 ? day : null;
  });

  const scheduledOnDay = (day: number | null) => {
    if (!day) return [];
    return posts.filter((p) => {
      const d = parseInt(p.date.split(" ")[1]);
      return d === day && p.status === "scheduled";
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Publishing</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Schedule and manage your content</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 glass rounded-xl p-1">
              <button
                onClick={() => setView("list")}
                className={"px-3 py-1.5 rounded-lg text-xs font-medium transition-all " + (view === "list" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
              >
                List
              </button>
              <button
                onClick={() => setView("calendar")}
                className={"px-3 py-1.5 rounded-lg text-xs font-medium transition-all " + (view === "calendar" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
              >
                Calendar
              </button>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors">
              <Plus className="w-4 h-4" />
              New Post
            </button>
          </div>
        </div>

        {view === "list" ? (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-foreground/5">
                    {["Post", "Platform", "Type", "Status", "Scheduled"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {posts.map((p) => {
                    const Icon = typeIcon[p.type as keyof typeof typeIcon] ?? FileText;
                    return (
                      <tr key={p.id} className="border-b border-foreground/5 last:border-0 hover:bg-foreground/3 transition-colors">
                        <td className="px-5 py-3.5 text-sm font-medium">{p.title}</td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs px-2 py-1 rounded-full bg-foreground/5 text-foreground/70">{p.platform}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs capitalize text-muted-foreground">{p.type}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={"text-xs px-2 py-1 rounded-full font-medium capitalize " + (statusStyle[p.status] ?? "bg-slate-100 text-slate-600")}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{p.date}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{p.time}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <button className="p-1.5 rounded-lg hover:bg-foreground/8 transition-colors">
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <h2 className="text-sm font-semibold">{month}</h2>
              <button className="p-1.5 rounded-lg hover:bg-foreground/8 transition-colors">
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calDays.map((day, i) => {
                const dayPosts = scheduledOnDay(day);
                return (
                  <div
                    key={i}
                    className={"min-h-[72px] rounded-xl p-1.5 " + (day ? "hover:bg-foreground/5 transition-colors cursor-pointer" : "")}
                  >
                    {day && (
                      <>
                        <span className="text-xs text-muted-foreground">{day}</span>
                        <div className="mt-1 space-y-0.5">
                          {dayPosts.map((p) => (
                            <div key={p.id} className="text-xs bg-foreground/8 rounded-md px-1.5 py-0.5 truncate text-foreground/70">
                              {p.title}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
