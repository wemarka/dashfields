// GlobalSearch.tsx
// Inline expand search with:
// - Recent searches shown when empty (no default pages list)
// - @ prefix to scope search: @campaigns, @reports, @pages, @analytics
// - Cmd+K opens full dialog
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/core/components/ui/dialog";
import { Badge } from "@/core/components/ui/badge";
import {
  Search, Megaphone, FileText, BarChart3, Settings, CalendarDays,
  Sparkles, Users, Hash, Swords, FlaskConical, Link2, Bell,
  SplitSquareHorizontal, Layers2, TrendingUp, Send, LineChart, BellDot,
  LayoutDashboard, ArrowRight, X, Clock, AtSign,
} from "lucide-react";

// ─── Static nav pages ─────────────────────────────────────────────────────────
const PAGES = [
  { label: "Dashboard",          path: "/",                    icon: LayoutDashboard, category: "Pages" },
  { label: "Campaigns",          path: "/campaigns",           icon: Megaphone,       category: "Pages" },
  { label: "Analytics Overview", path: "/analytics",           icon: BarChart3,       category: "Pages" },
  { label: "Audience",           path: "/audience",            icon: Users,           category: "Pages" },
  { label: "Post Analytics",     path: "/post-analytics",      icon: TrendingUp,      category: "Pages" },
  { label: "Compare Periods",    path: "/compare",             icon: BarChart3,       category: "Pages" },
  { label: "Hashtag Analytics",  path: "/hashtags",            icon: Hash,            category: "Pages" },
  { label: "Competitors",        path: "/competitors",         icon: Swords,          category: "Pages" },
  { label: "Advanced Analytics", path: "/advanced-analytics",  icon: FlaskConical,    category: "Pages" },
  { label: "A/B Testing",        path: "/ab-testing",          icon: SplitSquareHorizontal, category: "Pages" },
  { label: "Audience Overlap",   path: "/audience-overlap",    icon: Layers2,         category: "Pages" },
  { label: "Content Calendar",   path: "/calendar",            icon: CalendarDays,    category: "Pages" },
  { label: "AI Studio",          path: "/ai-content",          icon: Sparkles,        category: "Pages" },
  { label: "Reports",            path: "/reports",             icon: FileText,        category: "Pages" },
  { label: "Publishing",         path: "/publishing",          icon: Send,            category: "Pages" },
  { label: "Insights",           path: "/insights",            icon: LineChart,       category: "Pages" },
  { label: "Notifications",      path: "/notifications",       icon: BellDot,         category: "Pages" },
  { label: "Alerts",             path: "/alerts",              icon: Bell,            category: "Pages" },
  { label: "Connections",        path: "/connections",         icon: Link2,           category: "Pages" },
  { label: "Settings",           path: "/settings",            icon: Settings,        category: "Pages" },
];

// ─── @ Scope definitions ──────────────────────────────────────────────────────
const SCOPES = [
  { key: "pages",     label: "Pages",     icon: LayoutDashboard, description: "Navigate to any page" },
  { key: "campaigns", label: "Campaigns", icon: Megaphone,       description: "Search your campaigns" },
  { key: "reports",   label: "Reports",   icon: FileText,        description: "Search your reports" },
  { key: "analytics", label: "Analytics", icon: BarChart3,       description: "Analytics pages" },
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

// ─── localStorage helpers ─────────────────────────────────────────────────────
const RECENT_KEY = "dashfields_recent_searches";
const MAX_RECENT = 5;

function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}
function saveRecent(term: string) {
  if (!term.trim()) return;
  const prev = loadRecent().filter(t => t !== term);
  const next = [term, ...prev].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}
function removeRecentItem(term: string) {
  const next = loadRecent().filter(t => t !== term);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

// ─── Parse @ scope from query ─────────────────────────────────────────────────
function parseScope(q: string): { scope: string | null; term: string } {
  const match = q.match(/^@(\w+)\s*(.*)/);
  if (match) return { scope: match[1].toLowerCase(), term: match[2].trim() };
  return { scope: null, term: q };
}

// ─── Component ────────────────────────────────────────────────────────────────
export function GlobalSearch() {
  const [expanded, setExpanded] = useState(false);
  const [inlineQuery, setInlineQuery] = useState("");
  const [inlineIdx, setInlineIdx] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const inlineContainerRef = useRef<HTMLDivElement>(null);

  // Dialog state (Cmd+K)
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [dialogRecent, setDialogRecent] = useState<string[]>([]);
  const dialogInputRef = useRef<HTMLInputElement>(null);

  const [, setLocation] = useLocation();
  const { activeWorkspace } = useWorkspace();

  const { data: campaigns = [] } = trpc.campaigns.list.useQuery(
    { workspaceId: activeWorkspace?.id },
    { enabled: open || expanded }
  );
  const { data: reports = [] } = trpc.reports.list.useQuery(
    { workspaceId: activeWorkspace?.id },
    { enabled: open || expanded }
  );

  const campaignIds = useMemo(() => (campaigns as Array<{id: number}>).map(c => c.id).join(','), [campaigns]);
  const reportIds = useMemo(() => (reports as Array<{id: number}>).map(r => r.id).join(','), [reports]);

  // ── Build inline results ──────────────────────────────────────────────────
  const inlineResults: SearchResult[] = useMemo(() => {
    if (!expanded || !inlineQuery.trim()) return [];
    const { scope, term } = parseScope(inlineQuery);
    const lq = term.toLowerCase();
    const matched: SearchResult[] = [];

    // If just "@" with no scope yet, return empty (scope suggestions shown separately)
    if (inlineQuery.trim() === "@") return [];

    // Scope: pages or no scope
    if (!scope || scope === "pages" || scope === "analytics") {
      const filtered = scope === "analytics"
        ? PAGES.filter(p => p.category === "Pages" && (p.label.toLowerCase().includes("analytic") || p.label.toLowerCase().includes("insight")))
        : PAGES;
      filtered.forEach(p => {
        if (!lq || p.label.toLowerCase().includes(lq))
          matched.push({ ...p, id: p.path });
      });
    }

    // Scope: campaigns or no scope
    if (!scope || scope === "campaigns") {
      (campaigns as Array<{ id: number; name: string; platform: string; status: string }>).forEach(c => {
        if (!lq || c.name.toLowerCase().includes(lq))
          matched.push({ id: `campaign-${c.id}`, label: c.name, sublabel: `${c.platform} · ${c.status}`, path: "/ads/campaigns", icon: Megaphone, category: "Campaigns", badge: c.status });
      });
    }

    // Scope: reports or no scope
    if (!scope || scope === "reports") {
      (reports as Array<{ id: number; name: string; schedule: string; format: string }>).forEach(r => {
        if (!lq || r.name.toLowerCase().includes(lq))
          matched.push({ id: `report-${r.id}`, label: r.name, sublabel: `${r.schedule} · ${r.format.toUpperCase()}`, path: "/reports", icon: FileText, category: "Reports" });
      });
    }

    return matched.slice(0, 8);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inlineQuery, expanded, campaignIds, reportIds]);

  // ── Dialog results ────────────────────────────────────────────────────────
  const dialogResults: SearchResult[] = useMemo(() => {
    if (!query.trim()) return [];
    const { scope, term } = parseScope(query);
    const lq = term.toLowerCase();
    const matched: SearchResult[] = [];

    if (!scope || scope === "pages" || scope === "analytics") {
      const filtered = scope === "analytics"
        ? PAGES.filter(p => p.label.toLowerCase().includes("analytic") || p.label.toLowerCase().includes("insight"))
        : PAGES;
      filtered.forEach(p => {
        if (!lq || p.label.toLowerCase().includes(lq))
          matched.push({ ...p, id: p.path });
      });
    }
    if (!scope || scope === "campaigns") {
      (campaigns as Array<{ id: number; name: string; platform: string; status: string }>).forEach(c => {
        if (!lq || c.name.toLowerCase().includes(lq))
          matched.push({ id: `campaign-${c.id}`, label: c.name, sublabel: `${c.platform} · ${c.status}`, path: "/ads/campaigns", icon: Megaphone, category: "Campaigns", badge: c.status });
      });
    }
    if (!scope || scope === "reports") {
      (reports as Array<{ id: number; name: string; schedule: string; format: string }>).forEach(r => {
        if (!lq || r.name.toLowerCase().includes(lq))
          matched.push({ id: `report-${r.id}`, label: r.name, sublabel: `${r.schedule} · ${r.format.toUpperCase()}`, path: "/reports", icon: FileText, category: "Reports" });
      });
    }
    return matched.slice(0, 8);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, campaignIds, reportIds]);

  // ── Scope suggestions (when user types "@") ───────────────────────────────
  const showScopeSuggestions = inlineQuery === "@" || (inlineQuery.startsWith("@") && !inlineQuery.includes(" ") && inlineQuery.length > 1);
  const scopeSuggestions = showScopeSuggestions
    ? SCOPES.filter(s => inlineQuery === "@" || s.key.startsWith(inlineQuery.slice(1).toLowerCase()))
    : [];

  // ── Load recent when expanded ─────────────────────────────────────────────
  useEffect(() => {
    if (expanded) { setRecentSearches(loadRecent()); setInlineIdx(0); }
  }, [expanded]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setDialogRecent(loadRecent());
      setTimeout(() => dialogInputRef.current?.focus(), 50);
    }
  }, [open]);

  // ── Close inline on outside click ─────────────────────────────────────────
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

  // ── Navigate helper ───────────────────────────────────────────────────────
  const navigateTo = useCallback((path: string, term?: string) => {
    if (term?.trim() && !term.startsWith("@")) {
      saveRecent(term.trim());
      setRecentSearches(loadRecent());
    }
    setTimeout(() => setLocation(path), 0);
  }, [setLocation]);

  // ── Inline keyboard navigation ────────────────────────────────────────────
  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (showScopeSuggestions) {
      if (e.key === "ArrowDown") { e.preventDefault(); setInlineIdx(i => Math.min(i + 1, scopeSuggestions.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setInlineIdx(i => Math.max(i - 1, 0)); }
      else if (e.key === "Enter" && scopeSuggestions[inlineIdx]) {
        e.preventDefault();
        setInlineQuery(`@${scopeSuggestions[inlineIdx].key} `);
        setInlineIdx(0);
      } else if (e.key === "Escape") { setExpanded(false); setInlineQuery(""); }
      return;
    }

    const isEmptyWithRecent = !inlineQuery && recentSearches.length > 0;
    const totalItems = isEmptyWithRecent ? recentSearches.length : inlineResults.length;

    if (e.key === "ArrowDown") { e.preventDefault(); setInlineIdx(i => Math.min(i + 1, totalItems - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setInlineIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (isEmptyWithRecent && recentSearches[inlineIdx]) {
        setInlineQuery(recentSearches[inlineIdx]);
        setInlineIdx(0);
        return;
      }
      if (inlineResults[inlineIdx]) {
        const item = inlineResults[inlineIdx];
        setExpanded(false);
        setInlineQuery("");
        navigateTo(item.path, inlineQuery);
      }
    } else if (e.key === "Escape") { setExpanded(false); setInlineQuery(""); }
  };

  // ── Dialog keyboard navigation ────────────────────────────────────────────
  const handleDialogKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, dialogResults.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (dialogResults[selectedIdx]) {
        setOpen(false);
        navigateTo(dialogResults[selectedIdx].path, query);
      }
    } else if (e.key === "Escape") { setOpen(false); }
  }, [dialogResults, selectedIdx, query, navigateTo]);

  // ── Cmd+K shortcut ────────────────────────────────────────────────────────
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

  // ── Group dialog results ──────────────────────────────────────────────────
  const grouped = dialogResults.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  // ── Determine what to show in inline dropdown ─────────────────────────────
  const showRecent = expanded && !inlineQuery && recentSearches.length > 0;
  const showResults = expanded && inlineQuery.trim() && !showScopeSuggestions && inlineResults.length > 0;
  const showNoResults = expanded && inlineQuery.trim() && !showScopeSuggestions && inlineResults.length === 0;
  const showDropdown = showRecent || showResults || showNoResults || (expanded && showScopeSuggestions && scopeSuggestions.length > 0);

  // ── Active scope badge ────────────────────────────────────────────────────
  const { scope: activeScope } = parseScope(inlineQuery);

  return (
    <>
      {/* ── Inline expand search ─────────────────────────────────────────── */}
      <div ref={inlineContainerRef} className="relative flex items-center">
        <div
          className="flex items-center overflow-hidden transition-all duration-200 ease-out"
          style={{
            width: expanded ? 240 : 32,
            background: expanded ? '#f7f7f8' : 'transparent',
            border: expanded ? '1px solid #e5e5e5' : '1px solid transparent',
            borderRadius: 8,
          }}
        >
          <button
            onClick={() => !expanded && setExpanded(true)}
            tabIndex={expanded ? -1 : 0}
            className="shrink-0 w-8 h-8 flex items-center justify-center text-foreground/40 hover:text-foreground/70 transition-colors"
          >
            <Search className="w-[18px] h-[18px]" />
          </button>

          {expanded && (
            <div className="flex items-center flex-1 min-w-0 pr-2">
              {/* Active scope badge */}
              {activeScope && (
                <span className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 rounded px-1.5 py-0.5 mr-1.5">
                  <AtSign className="w-2.5 h-2.5" />{activeScope}
                </span>
              )}
              <input
                ref={inlineInputRef}
                value={inlineQuery}
                onChange={e => { setInlineQuery(e.target.value); setInlineIdx(0); }}
                onKeyDown={handleInlineKeyDown}
                autoFocus
                placeholder={activeScope ? `Search in ${activeScope}...` : "Search or type @ to filter..."}
                className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-foreground/30 min-w-0"
              />
            </div>
          )}
        </div>

        {/* Inline dropdown */}
        {showDropdown && (
          <div
            className="absolute top-full mt-1.5 left-0 rounded-xl overflow-hidden z-50"
            style={{ width: 300, background: '#ffffff', border: '1px solid #ebebeb', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
          >
            {/* @ Scope suggestions */}
            {showScopeSuggestions && scopeSuggestions.length > 0 && (
              <div>
                <div className="px-3 pt-2.5 pb-1">
                  <span className="text-[10px] font-semibold tracking-widest uppercase text-foreground/30 flex items-center gap-1">
                    <AtSign className="w-3 h-3" /> Filter by scope
                  </span>
                </div>
                {scopeSuggestions.map((s, i) => {
                  const isSelected = i === inlineIdx;
                  return (
                    <button
                      key={s.key}
                      onClick={() => { setInlineQuery(`@${s.key} `); setInlineIdx(0); setTimeout(() => inlineInputRef.current?.focus(), 0); }}
                      onMouseEnter={() => setInlineIdx(i)}
                      className={["w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors", isSelected ? "bg-[#f0f0f0]" : "hover:bg-[#f7f7f8]"].join(" ")}
                    >
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${isSelected ? "bg-blue-100" : "bg-foreground/5"}`}>
                        <s.icon className={`w-3.5 h-3.5 ${isSelected ? "text-blue-600" : "text-foreground/40"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-foreground/80">@{s.key}</div>
                        <div className="text-[11px] text-foreground/40">{s.description}</div>
                      </div>
                      {isSelected && <ArrowRight className="w-3 h-3 text-foreground/30 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Recent searches */}
            {showRecent && (
              <div>
                <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                  <span className="text-[10px] font-semibold tracking-widest uppercase text-foreground/30 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Recent
                  </span>
                  <button
                    onClick={() => { localStorage.removeItem(RECENT_KEY); setRecentSearches([]); }}
                    className="text-[10px] text-foreground/30 hover:text-foreground/60 transition-colors"
                  >Clear all</button>
                </div>
                {recentSearches.map((term, i) => (
                  <div
                    key={term}
                    className={["flex items-center gap-2.5 px-3 py-2 group cursor-pointer", i === inlineIdx ? "bg-[#f0f0f0]" : "hover:bg-[#f7f7f8]"].join(" ")}
                    onMouseEnter={() => setInlineIdx(i)}
                  >
                    <Clock className="w-3.5 h-3.5 text-foreground/25 shrink-0" />
                    <button
                      className="flex-1 text-left text-[13px] text-foreground/70 truncate"
                      onClick={() => { setInlineQuery(term); setInlineIdx(0); }}
                    >{term}</button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecentItem(term);
                        setRecentSearches(r => r.filter(t => t !== term));
                      }}
                      className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center text-foreground/30 hover:text-foreground/60 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <div className="px-3 py-2 border-t border-[#f0f0f0] flex items-center justify-between">
                  <span className="text-[11px] text-foreground/30">
                    Type <kbd className="font-mono bg-foreground/5 rounded px-1">@</kbd> to filter by scope
                  </span>
                  <span className="text-[11px] text-foreground/30">
                    <kbd className="font-mono bg-foreground/5 rounded px-1">⌘K</kbd> full search
                  </span>
                </div>
              </div>
            )}

            {/* Search results */}
            {showResults && (
              <div>
                {activeScope && (
                  <div className="px-3 pt-2.5 pb-1 flex items-center gap-1">
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-blue-500 flex items-center gap-1">
                      <AtSign className="w-3 h-3" />{activeScope}
                    </span>
                  </div>
                )}
                {inlineResults.map((item, i) => {
                  const isSelected = i === inlineIdx;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setExpanded(false); setInlineQuery(""); navigateTo(item.path, inlineQuery); }}
                      onMouseEnter={() => setInlineIdx(i)}
                      className={["w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors", isSelected ? "bg-[#f0f0f0]" : "hover:bg-[#f7f7f8]"].join(" ")}
                    >
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${isSelected ? "bg-foreground/10" : "bg-foreground/5"}`}>
                        <item.icon className="w-3.5 h-3.5 text-foreground/50" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-foreground/80 truncate">{item.label}</div>
                        {item.sublabel && <div className="text-[11px] text-foreground/40 truncate">{item.sublabel}</div>}
                      </div>
                      {item.badge && <span className="text-[10px] text-foreground/40 shrink-0">{item.badge}</span>}
                      {isSelected && <ArrowRight className="w-3 h-3 text-foreground/30 shrink-0" />}
                    </button>
                  );
                })}
                <div className="px-3 py-1.5 border-t border-[#f0f0f0]">
                  <span className="text-[11px] text-foreground/30">Press <kbd className="font-mono bg-foreground/5 rounded px-1">⌘K</kbd> for full search</span>
                </div>
              </div>
            )}

            {/* No results */}
            {showNoResults && (
              <div className="px-3 py-5 text-center">
                <div className="text-[13px] text-foreground/40">No results for "{inlineQuery}"</div>
                <div className="text-[11px] text-foreground/25 mt-1">Try <kbd className="font-mono bg-foreground/5 rounded px-1">⌘K</kbd> for full search</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Full command-palette Dialog (Cmd+K) ──────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 max-w-xl overflow-hidden gap-0 top-[20%] translate-y-0 [&>button]:hidden">
          <DialogTitle className="sr-only">Global Search</DialogTitle>
          <DialogDescription className="sr-only">Search across campaigns, reports, alerts, and more</DialogDescription>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={dialogInputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
              onKeyDown={handleDialogKeyDown}
              placeholder="Search or type @ to filter by scope..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto py-2">
            {/* Recent searches chips */}
            {!query && dialogRecent.length > 0 && (
              <div className="mb-1">
                <div className="flex items-center justify-between px-4 py-1.5">
                  <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Recent searches
                  </span>
                  <button
                    onClick={() => { localStorage.removeItem(RECENT_KEY); setDialogRecent([]); }}
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >Clear all</button>
                </div>
                <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                  {dialogRecent.map(term => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] bg-muted/50 hover:bg-muted text-foreground/60 hover:text-foreground transition-colors"
                    >
                      <Clock className="w-3 h-3" />
                      {term}
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRecentItem(term);
                          setDialogRecent(r => r.filter(t => t !== term));
                        }}
                        className="ml-0.5 hover:text-foreground"
                      >×</span>
                    </button>
                  ))}
                </div>
                <div className="px-4 pb-1">
                  <div className="text-[11px] text-muted-foreground/50 flex items-center gap-1">
                    <AtSign className="w-3 h-3" /> Type <kbd className="font-mono bg-muted rounded px-1 mx-0.5">@campaigns</kbd> <kbd className="font-mono bg-muted rounded px-1 mx-0.5">@reports</kbd> <kbd className="font-mono bg-muted rounded px-1 mx-0.5">@pages</kbd> to filter
                  </div>
                </div>
                <div className="border-t border-border mx-4 mt-1" />
              </div>
            )}

            {!query && dialogRecent.length === 0 && (
              <div className="px-4 py-6 text-center">
                <Search className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                <div className="text-sm text-muted-foreground">Search campaigns, reports, pages...</div>
                <div className="text-[11px] text-muted-foreground/50 mt-1.5 flex items-center justify-center gap-1">
                  <AtSign className="w-3 h-3" /> Use <kbd className="font-mono bg-muted rounded px-1 mx-0.5">@campaigns</kbd> or <kbd className="font-mono bg-muted rounded px-1 mx-0.5">@reports</kbd> to filter
                </div>
              </div>
            )}

            {query && dialogResults.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No results for "{query}"</div>
            )}

            {query && dialogResults.length > 0 && Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="px-4 py-1.5 text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50">{category}</div>
                {items.map((item) => {
                  const globalIdx = dialogResults.findIndex(r => r.id === item.id);
                  const isSelected = globalIdx === selectedIdx;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setOpen(false); navigateTo(item.path, query); }}
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
            ))}
          </div>

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
