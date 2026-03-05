// GlobalSearch.tsx
// Command-palette style global search (Cmd+K / Ctrl+K).
// Searches campaigns, pages, reports, and settings in real time.
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/core/lib/trpc";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/core/components/ui/dialog";
import { Badge } from "@/core/components/ui/badge";
import {
  Search, Megaphone, FileText, BarChart3, Settings, CalendarDays,
  Sparkles, Users, Hash, Swords, FlaskConical, Link2, Bell,
  SplitSquareHorizontal, Layers2, TrendingUp, Send, LineChart, BellDot,
  LayoutDashboard, ArrowRight, Command,
} from "lucide-react";

// ─── Static nav pages ─────────────────────────────────────────────────────────
const PAGES = [
  { label: "Dashboard",          path: "/",                    icon: LayoutDashboard, category: "Navigation" },
  { label: "Campaigns",          path: "/campaigns",           icon: Megaphone,       category: "Navigation" },
  { label: "Analytics Overview", path: "/analytics",           icon: BarChart3,       category: "Navigation" },
  { label: "Audience",           path: "/audience",            icon: Users,           category: "Navigation" },
  { label: "Post Analytics",     path: "/post-analytics",      icon: TrendingUp,      category: "Navigation" },
  { label: "Compare Periods",    path: "/compare",             icon: BarChart3,       category: "Navigation" },
  { label: "Hashtag Analytics",  path: "/hashtags",            icon: Hash,            category: "Navigation" },
  { label: "Competitors",        path: "/competitors",         icon: Swords,          category: "Navigation" },
  { label: "Advanced Analytics", path: "/advanced-analytics",  icon: FlaskConical,    category: "Navigation" },
  { label: "A/B Testing",        path: "/ab-testing",          icon: SplitSquareHorizontal, category: "Navigation" },
  { label: "Audience Overlap",   path: "/audience-overlap",    icon: Layers2,         category: "Navigation" },
  { label: "Content Calendar",   path: "/calendar",            icon: CalendarDays,    category: "Navigation" },
  { label: "AI Studio",          path: "/ai-content",          icon: Sparkles,        category: "Navigation" },
  { label: "Reports",            path: "/reports",             icon: FileText,        category: "Navigation" },
  { label: "Publishing",         path: "/publishing",          icon: Send,            category: "Navigation" },
  { label: "Insights",           path: "/insights",            icon: LineChart,       category: "Navigation" },
  { label: "Notifications",      path: "/notifications",       icon: BellDot,         category: "Navigation" },
  { label: "Alerts",             path: "/alerts",              icon: Bell,            category: "Navigation" },
  { label: "Connections",        path: "/connections",         icon: Link2,           category: "Navigation" },
  { label: "Settings",           path: "/settings",            icon: Settings,        category: "Navigation" },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type SearchResult = {
  id: string;
  label: string;
  sublabel?: string;
  path: string;
  icon: React.ElementType;
  category: string;
  badge?: string;
};

// ─── Component ────────────────────────────────────────────────────────────────
export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch campaigns for search
  const { data: campaigns = [] } = trpc.campaigns.list.useQuery(
    undefined,
    { enabled: open }
  );

  // Fetch reports for search
  const { data: reports = [] } = trpc.reports.list.useQuery(
    undefined,
    { enabled: open }
  );

  // Build results
  const results: SearchResult[] = (() => {
    if (!query.trim()) {
      // Show top pages when no query
      return PAGES.slice(0, 8).map(p => ({ ...p, id: p.path }));
    }

    const q = query.toLowerCase();
    const matched: SearchResult[] = [];

    // Pages
    PAGES.forEach(p => {
      if (p.label.toLowerCase().includes(q)) {
        matched.push({ ...p, id: p.path });
      }
    });

    // Campaigns
    (campaigns as Array<{ id: number; name: string; platform: string; status: string }>).forEach(c => {
      if (c.name.toLowerCase().includes(q)) {
        matched.push({
          id: `campaign-${c.id}`,
          label: c.name,
          sublabel: `${c.platform} · ${c.status}`,
          path: "/campaigns",
          icon: Megaphone,
          category: "Campaigns",
          badge: c.status,
        });
      }
    });

    // Reports
    (reports as Array<{ id: number; name: string; schedule: string; format: string }>).forEach(r => {
      if (r.name.toLowerCase().includes(q)) {
        matched.push({
          id: `report-${r.id}`,
          label: r.name,
          sublabel: `${r.schedule} · ${r.format.toUpperCase()}`,
          path: "/reports",
          icon: FileText,
          category: "Reports",
        });
      }
    });

    return matched.slice(0, 12);
  })();

  // Keyboard shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Arrow key navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIdx]) {
        setLocation(results[selectedIdx].path);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }, [results, selectedIdx, setLocation]);

  // Group results by category
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  return (
    <>
      {/* Trigger button in header */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-foreground/5 hover:bg-foreground/10 text-muted-foreground text-sm transition-colors border border-border/50"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="text-xs">Search...</span>
        <kbd className="ml-2 flex items-center gap-0.5 text-[10px] font-mono bg-background border border-border rounded px-1 py-0.5">
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 max-w-xl overflow-hidden gap-0 top-[20%] translate-y-0 [&>button]:hidden">
          {/* Hidden title for screen reader accessibility */}
          <DialogTitle className="sr-only">Global Search</DialogTitle>
          <DialogDescription className="sr-only">Search across campaigns, reports, alerts, and more</DialogDescription>
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
              onKeyDown={handleKeyDown}
              placeholder="Search pages, campaigns, reports..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto py-2">
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No results for "{query}"
              </div>
            ) : (
              Object.entries(grouped).map(([category, items]) => {
                const flatIdx = results.findIndex(r => r.id === items[0].id);
                return (
                  <div key={category}>
                    <div className="px-4 py-1.5 text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50">
                      {category}
                    </div>
                    {items.map((item, i) => {
                      const globalIdx = results.findIndex(r => r.id === item.id);
                      const isSelected = globalIdx === selectedIdx;
                      return (
                        <button
                          key={item.id}
                          onClick={() => { setLocation(item.path); setOpen(false); }}
                          onMouseEnter={() => setSelectedIdx(globalIdx)}
                          className={[
                            "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                            isSelected ? "bg-primary/10" : "hover:bg-foreground/5",
                          ].join(" ")}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-primary/15" : "bg-foreground/8"}`}>
                            <item.icon className={`w-3.5 h-3.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{item.label}</div>
                            {item.sublabel && (
                              <div className="text-xs text-muted-foreground truncate">{item.sublabel}</div>
                            )}
                          </div>
                          {item.badge && (
                            <Badge variant="outline" className="text-[10px] shrink-0">{item.badge}</Badge>
                          )}
                          {isSelected && (
                            <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><kbd className="font-mono bg-background border border-border rounded px-1">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="font-mono bg-background border border-border rounded px-1">↵</kbd> open</span>
            <span className="flex items-center gap-1"><kbd className="font-mono bg-background border border-border rounded px-1">Esc</kbd> close</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
