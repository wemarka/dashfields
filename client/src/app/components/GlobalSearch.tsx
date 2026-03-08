// GlobalSearch.tsx
// Topbar search: icon expands to inline input on click, collapses on blur/Escape.
// Full command-palette Dialog still opens on Cmd+K / Ctrl+K.
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/core/components/ui/dialog";
import { Badge } from "@/core/components/ui/badge";
import {
  Search, Megaphone, FileText, BarChart3, Settings, CalendarDays,
  Sparkles, Users, Hash, Swords, FlaskConical, Link2, Bell,
  SplitSquareHorizontal, Layers2, TrendingUp, Send, LineChart, BellDot,
  LayoutDashboard, ArrowRight,
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
  // Inline expand state
  const [expanded, setExpanded] = useState(false);
  const [inlineQuery, setInlineQuery] = useState("");
  const [inlineResults, setInlineResults] = useState<SearchResult[]>([]);
  const [inlineIdx, setInlineIdx] = useState(0);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const inlineContainerRef = useRef<HTMLDivElement>(null);

  // Dialog state (Cmd+K)
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const dialogInputRef = useRef<HTMLInputElement>(null);

  const [, setLocation] = useLocation();
  const { activeWorkspace } = useWorkspace();

  // Fetch campaigns for search
  const { data: campaigns = [] } = trpc.campaigns.list.useQuery(
    { workspaceId: activeWorkspace?.id },
    { enabled: open || expanded }
  );

  // Fetch reports for search
  const { data: reports = [] } = trpc.reports.list.useQuery(
    { workspaceId: activeWorkspace?.id },
    { enabled: open || expanded }
  );

  // ── Build results helper ───────────────────────────────────────────────────
  const buildResults = useCallback((q: string): SearchResult[] => {
    if (!q.trim()) return PAGES.slice(0, 6).map(p => ({ ...p, id: p.path }));
    const lq = q.toLowerCase();
    const matched: SearchResult[] = [];
    PAGES.forEach(p => { if (p.label.toLowerCase().includes(lq)) matched.push({ ...p, id: p.path }); });
    (campaigns as Array<{ id: number; name: string; platform: string; status: string }>).forEach(c => {
      if (c.name.toLowerCase().includes(lq)) matched.push({ id: `campaign-${c.id}`, label: c.name, sublabel: `${c.platform} · ${c.status}`, path: "/campaigns", icon: Megaphone, category: "Campaigns", badge: c.status });
    });
    (reports as Array<{ id: number; name: string; schedule: string; format: string }>).forEach(r => {
      if (r.name.toLowerCase().includes(lq)) matched.push({ id: `report-${r.id}`, label: r.name, sublabel: `${r.schedule} · ${r.format.toUpperCase()}`, path: "/reports", icon: FileText, category: "Reports" });
    });
    return matched.slice(0, 8);
  }, [campaigns, reports]);

  // Update inline results when query changes
  useEffect(() => {
    if (expanded) {
      setInlineResults(buildResults(inlineQuery));
      setInlineIdx(0);
    }
  }, [inlineQuery, expanded, buildResults]);

  // Update dialog results when query changes
  const dialogResults: SearchResult[] = (() => buildResults(query))();

  // Keyboard shortcut Cmd+K / Ctrl+K → open Dialog
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setExpanded(false);
        setOpen(o => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when expanded
  useEffect(() => {
    if (expanded) {
      setInlineQuery("");
      setTimeout(() => inlineInputRef.current?.focus(), 50);
    }
  }, [expanded]);

  // Reset on dialog open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => dialogInputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close inline on outside click
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (inlineContainerRef.current && !inlineContainerRef.current.contains(e.target as Node)) {
        setExpanded(false);
        setInlineQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expanded]);

  // Inline keyboard navigation
  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setInlineIdx(i => Math.min(i + 1, inlineResults.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setInlineIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (inlineResults[inlineIdx]) { setLocation(inlineResults[inlineIdx].path); setExpanded(false); setInlineQuery(""); }
    } else if (e.key === "Escape") { setExpanded(false); setInlineQuery(""); }
  };

  // Dialog keyboard navigation
  const handleDialogKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, dialogResults.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (dialogResults[selectedIdx]) { setLocation(dialogResults[selectedIdx].path); setOpen(false); }
    } else if (e.key === "Escape") { setOpen(false); }
  }, [dialogResults, selectedIdx, setLocation]);

  // Group dialog results by category
  const grouped = dialogResults.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  return (
    <>
      {/* ── Inline expand search ─────────────────────────────────────────── */}
      <div ref={inlineContainerRef} className="relative flex items-center">
        {/* Animated container */}
        <div
          className="flex items-center overflow-hidden transition-all duration-200 ease-out"
          style={{
            width: expanded ? 220 : 32,
            background: expanded ? '#f7f7f8' : 'transparent',
            border: expanded ? '1px solid #e5e5e5' : '1px solid transparent',
            borderRadius: 8,
          }}
        >
          {/* Icon — always visible, acts as trigger when collapsed */}
          <button
            onClick={() => !expanded && setExpanded(true)}
            tabIndex={expanded ? -1 : 0}
            className="shrink-0 w-8 h-8 flex items-center justify-center text-foreground/40 hover:text-foreground/70 transition-colors"
          >
            <Search className="w-[18px] h-[18px]" />
          </button>

          {/* Input — only visible when expanded */}
          {expanded && (
            <input
              ref={inlineInputRef}
              value={inlineQuery}
              onChange={e => setInlineQuery(e.target.value)}
              onKeyDown={handleInlineKeyDown}
              placeholder="Search..."
              className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-foreground/30 pr-2 min-w-0"
            />
          )}
        </div>

        {/* Inline results dropdown */}
        {expanded && inlineResults.length > 0 && (
          <div
            className="absolute top-full mt-1.5 left-0 rounded-xl overflow-hidden z-50"
            style={{ width: 260, background: '#ffffff', border: '1px solid #ebebeb', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
          >
            {inlineResults.map((item, i) => {
              const isSelected = i === inlineIdx;
              return (
                <button
                  key={item.id}
                  onClick={() => { setLocation(item.path); setExpanded(false); setInlineQuery(""); }}
                  onMouseEnter={() => setInlineIdx(i)}
                  className={[
                    "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                    isSelected ? "bg-[#f0f0f0]" : "hover:bg-[#f7f7f8]",
                  ].join(" ")}
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${isSelected ? "bg-foreground/10" : "bg-foreground/5"}`}>
                    <item.icon className="w-3.5 h-3.5 text-foreground/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-foreground/80 truncate">{item.label}</div>
                    {item.sublabel && <div className="text-[11px] text-foreground/40 truncate">{item.sublabel}</div>}
                  </div>
                  {isSelected && <ArrowRight className="w-3 h-3 text-foreground/30 shrink-0" />}
                </button>
              );
            })}
            <div className="px-3 py-1.5 border-t border-[#f0f0f0]">
              <span className="text-[11px] text-foreground/30">Press <kbd className="font-mono bg-foreground/5 rounded px-1">⌘K</kbd> for full search</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Full command-palette Dialog (Cmd+K) ──────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 max-w-xl overflow-hidden gap-0 top-[20%] translate-y-0 [&>button]:hidden">
          <DialogTitle className="sr-only">Global Search</DialogTitle>
          <DialogDescription className="sr-only">Search across campaigns, reports, alerts, and more</DialogDescription>
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={dialogInputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
              onKeyDown={handleDialogKeyDown}
              placeholder="Search pages, campaigns, reports..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto py-2">
            {dialogResults.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No results for "{query}"</div>
            ) : (
              Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <div className="px-4 py-1.5 text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50">{category}</div>
                  {items.map((item) => {
                    const globalIdx = dialogResults.findIndex(r => r.id === item.id);
                    const isSelected = globalIdx === selectedIdx;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setLocation(item.path); setOpen(false); }}
                        onMouseEnter={() => setSelectedIdx(globalIdx)}
                        className={["w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors", isSelected ? "bg-primary/10" : "hover:bg-foreground/5"].join(" ")}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-primary/15" : "bg-foreground/8"}`}>
                          <item.icon className={`w-3.5 h-3.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{item.label}</div>
                          {item.sublabel && <div className="text-xs text-muted-foreground truncate">{item.sublabel}</div>}
                        </div>
                        {item.badge && <Badge variant="outline" className="text-[10px] shrink-0">{item.badge}</Badge>}
                        {isSelected && <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))
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
