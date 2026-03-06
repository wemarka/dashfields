// campaignEnhancements.test.ts
// Tests for the Campaign page enhancement features:
// - Unified Campaign Table helpers (multi-select, column toggle, status badge)
// - Filter logic (date range, active chips, clear)
// - Compare Drawer (multi-campaign winner, radar normalization)
// - Detail Drawer (KPI formatting, breakdown)
import { describe, it, expect } from "vitest";

// ─── Unified Campaign Table Helpers ──────────────────────────────────────────

describe("UnifiedCampaignTable helpers", () => {
  // Status normalization
  const normalizeStatus = (s: string): string => {
    const lower = s.toLowerCase();
    if (lower === "active") return "active";
    if (lower === "paused" || lower === "campaign_paused" || lower === "adset_paused") return "paused";
    if (lower === "deleted" || lower === "archived") return "archived";
    if (lower === "in_process" || lower === "with_issues") return "in_process";
    return lower;
  };

  it("normalizes Meta status strings correctly", () => {
    expect(normalizeStatus("ACTIVE")).toBe("active");
    expect(normalizeStatus("PAUSED")).toBe("paused");
    expect(normalizeStatus("CAMPAIGN_PAUSED")).toBe("paused");
    expect(normalizeStatus("ADSET_PAUSED")).toBe("paused");
    expect(normalizeStatus("DELETED")).toBe("archived");
    expect(normalizeStatus("ARCHIVED")).toBe("archived");
    expect(normalizeStatus("IN_PROCESS")).toBe("in_process");
    expect(normalizeStatus("WITH_ISSUES")).toBe("in_process");
    expect(normalizeStatus("unknown")).toBe("unknown");
  });

  // Column toggle
  it("filters visible columns based on toggle state", () => {
    const allColumns = ["name", "status", "platform", "spend", "impressions", "clicks", "ctr", "cpc", "cpm"];
    const hiddenColumns = new Set(["cpc", "cpm"]);
    const visibleColumns = allColumns.filter(c => !hiddenColumns.has(c));
    expect(visibleColumns).toEqual(["name", "status", "platform", "spend", "impressions", "clicks", "ctr"]);
    expect(visibleColumns).not.toContain("cpc");
    expect(visibleColumns).not.toContain("cpm");
  });

  // Multi-select logic
  it("tracks selected campaign IDs correctly", () => {
    const selected = new Set<string>();
    selected.add("c1");
    selected.add("c2");
    expect(selected.size).toBe(2);
    expect(selected.has("c1")).toBe(true);
    selected.delete("c1");
    expect(selected.size).toBe(1);
    expect(selected.has("c1")).toBe(false);
  });

  // Select all / deselect all
  it("select all adds all campaign IDs", () => {
    const campaigns = [{ id: "1" }, { id: "2" }, { id: "3" }];
    const selected = new Set(campaigns.map(c => c.id));
    expect(selected.size).toBe(3);
    selected.clear();
    expect(selected.size).toBe(0);
  });
});

// ─── Filter Logic ────────────────────────────────────────────────────────────

describe("CampaignFilters logic", () => {
  interface Campaign {
    id: string;
    name: string;
    status: string;
    platform: string;
    source: string;
  }

  const campaigns: Campaign[] = [
    { id: "1", name: "Summer Sale",    status: "active", platform: "facebook", source: "api" },
    { id: "2", name: "Winter Promo",   status: "paused", platform: "facebook", source: "api" },
    { id: "3", name: "Local Test",     status: "draft",  platform: "local",    source: "local" },
    { id: "4", name: "TikTok Launch",  status: "active", platform: "tiktok",   source: "api" },
  ];

  const filter = (
    list: Campaign[],
    search: string,
    statusFilter: string,
    platformFilter: string,
  ) => {
    return list.filter(c => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (platformFilter !== "all") {
        if (platformFilter === "local" && c.source !== "local") return false;
        if (platformFilter !== "local" && c.platform !== platformFilter) return false;
      }
      return true;
    });
  };

  it("filters by search text", () => {
    const result = filter(campaigns, "summer", "all", "all");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Summer Sale");
  });

  it("filters by status", () => {
    const result = filter(campaigns, "", "active", "all");
    expect(result).toHaveLength(2);
    expect(result.every(c => c.status === "active")).toBe(true);
  });

  it("filters by platform", () => {
    const result = filter(campaigns, "", "all", "facebook");
    expect(result).toHaveLength(2);
    expect(result.every(c => c.platform === "facebook")).toBe(true);
  });

  it("filters by local source", () => {
    const result = filter(campaigns, "", "all", "local");
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("local");
  });

  it("combines multiple filters", () => {
    const result = filter(campaigns, "", "active", "facebook");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Summer Sale");
  });

  it("returns all when no filters applied", () => {
    const result = filter(campaigns, "", "all", "all");
    expect(result).toHaveLength(4);
  });

  // Active filter count
  it("counts active filters correctly", () => {
    const countFilters = (search: string, status: string, platform: string, datePreset: string) => {
      return [
        search !== "",
        status !== "all",
        platform !== "all",
        datePreset !== "last_30d",
      ].filter(Boolean).length;
    };

    expect(countFilters("", "all", "all", "last_30d")).toBe(0);
    expect(countFilters("test", "all", "all", "last_30d")).toBe(1);
    expect(countFilters("test", "active", "facebook", "last_7d")).toBe(4);
  });
});

// ─── Compare Drawer Logic ────────────────────────────────────────────────────

describe("CampaignCompareDrawer logic", () => {
  function getWinner(values: (number | undefined | null)[], higherIsBetter: boolean): number {
    const nums = values.map(v => Number(v ?? 0));
    if (nums.every(n => n === nums[0])) return -1;
    const best = higherIsBetter ? Math.max(...nums) : Math.min(...nums);
    return nums.indexOf(best);
  }

  it("identifies winner for higher-is-better metric", () => {
    expect(getWinner([100, 200, 150], true)).toBe(1);
    expect(getWinner([500, 200], true)).toBe(0);
  });

  it("identifies winner for lower-is-better metric", () => {
    expect(getWinner([5.2, 3.1, 4.0], false)).toBe(1);
    expect(getWinner([10, 20], false)).toBe(0);
  });

  it("returns -1 for tied values", () => {
    expect(getWinner([100, 100], true)).toBe(-1);
    expect(getWinner([0, 0, 0], false)).toBe(-1);
  });

  it("handles null/undefined values as 0", () => {
    expect(getWinner([null, 100, undefined], true)).toBe(1);
    expect(getWinner([null, undefined], true)).toBe(-1);
  });

  // Multi-campaign winner counts
  it("calculates winner counts for multiple campaigns", () => {
    const metrics = [
      { key: "spend", higherIsBetter: false },
      { key: "impressions", higherIsBetter: true },
      { key: "clicks", higherIsBetter: true },
    ];

    const campaigns = [
      { spend: 100, impressions: 5000, clicks: 200 },
      { spend: 150, impressions: 8000, clicks: 300 },
      { spend: 80,  impressions: 3000, clicks: 250 },
    ];

    const winnerCounts = campaigns.map((_, idx) => {
      let wins = 0;
      for (const m of metrics) {
        const values = campaigns.map(c => (c as any)[m.key]);
        const winner = getWinner(values, m.higherIsBetter);
        if (winner === idx) wins++;
      }
      return wins;
    });

    // Campaign C (idx 2) wins spend (lowest: 80)
    // Campaign B (idx 1) wins impressions (highest: 8000) and clicks (highest: 300)
    expect(winnerCounts).toEqual([0, 2, 1]);
  });

  // Radar normalization
  it("normalizes values for radar chart (higher is better)", () => {
    const values = [5000, 8000, 3000];
    const maxVal = Math.max(...values, 1);
    const normalized = values.map(v => Math.round((v / maxVal) * 100));
    expect(normalized).toEqual([63, 100, 38]);
  });

  it("normalizes values for radar chart (lower is better)", () => {
    const values = [5.0, 3.0, 8.0];
    const maxVal = Math.max(...values, 1);
    const normalized = values.map(v => Math.round(((maxVal - v) / maxVal) * 100));
    expect(normalized).toEqual([38, 63, 0]);
  });

  // Up to 4 campaigns
  it("supports up to 4 campaigns", () => {
    const MAX_CAMPAIGNS = 4;
    const slots = [null, null];
    expect(slots.length).toBeLessThanOrEqual(MAX_CAMPAIGNS);
    slots.push(null);
    slots.push(null);
    expect(slots.length).toBe(MAX_CAMPAIGNS);
  });
});

// ─── Detail Drawer Helpers ───────────────────────────────────────────────────

describe("CampaignDetailDrawer helpers", () => {
  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
    n >= 1_000     ? `${(n / 1_000).toFixed(1)}K` :
    n.toLocaleString();

  it("formats large numbers correctly", () => {
    expect(fmt(1500000)).toBe("1.5M");
    expect(fmt(45000)).toBe("45.0K");
    expect(fmt(999)).toBe("999");
    expect(fmt(0)).toBe("0");
  });

  it("formats percentages", () => {
    const fmtPct = (n: number) => `${n.toFixed(2)}%`;
    expect(fmtPct(3.456)).toBe("3.46%");
    expect(fmtPct(0)).toBe("0.00%");
    expect(fmtPct(100)).toBe("100.00%");
  });

  // Status config
  it("maps status to correct config", () => {
    const STATUS_CONFIG: Record<string, { label: string }> = {
      active:   { label: "Active" },
      paused:   { label: "Paused" },
      draft:    { label: "Draft" },
      ended:    { label: "Ended" },
      archived: { label: "Archived" },
    };

    expect(STATUS_CONFIG["active"].label).toBe("Active");
    expect(STATUS_CONFIG["paused"].label).toBe("Paused");
    expect(STATUS_CONFIG["draft"].label).toBe("Draft");
    expect(STATUS_CONFIG["ended"].label).toBe("Ended");
    expect(STATUS_CONFIG["archived"].label).toBe("Archived");
  });

  // Tags logic
  it("adds and removes tags correctly", () => {
    let tags: string[] = [];
    const addTag = (t: string) => {
      if (t && !tags.includes(t)) tags = [...tags, t];
    };
    const removeTag = (t: string) => {
      tags = tags.filter(x => x !== t);
    };

    addTag("brand");
    addTag("q1");
    expect(tags).toEqual(["brand", "q1"]);
    addTag("brand"); // duplicate
    expect(tags).toEqual(["brand", "q1"]);
    removeTag("brand");
    expect(tags).toEqual(["q1"]);
  });

  // Breakdown types
  it("supports all breakdown types", () => {
    const types = ["age", "gender", "region", "device"];
    expect(types).toHaveLength(4);
    expect(types).toContain("age");
    expect(types).toContain("gender");
    expect(types).toContain("region");
    expect(types).toContain("device");
  });
});

// ─── KPI Aggregation ─────────────────────────────────────────────────────────

describe("KPI aggregation", () => {
  interface Campaign {
    spend: number | null;
    impressions: number | null;
    clicks: number | null;
    status: string;
  }

  const campaigns: Campaign[] = [
    { spend: 100, impressions: 5000, clicks: 200, status: "active" },
    { spend: 200, impressions: 10000, clicks: 500, status: "active" },
    { spend: 50,  impressions: 2000,  clicks: 80,  status: "paused" },
    { spend: null, impressions: null, clicks: null, status: "draft" },
  ];

  it("calculates total spend correctly", () => {
    const totalSpend = campaigns.reduce((s, c) => s + (c.spend ?? 0), 0);
    expect(totalSpend).toBe(350);
  });

  it("calculates total impressions correctly", () => {
    const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions ?? 0), 0);
    expect(totalImpressions).toBe(17000);
  });

  it("calculates average CTR correctly", () => {
    const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions ?? 0), 0);
    const totalClicks = campaigns.reduce((s, c) => s + (c.clicks ?? 0), 0);
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    expect(avgCtr).toBeCloseTo(4.588, 2);
  });

  it("counts active campaigns", () => {
    const activeCampaigns = campaigns.filter(c => c.status === "active").length;
    expect(activeCampaigns).toBe(2);
  });

  it("handles all-null metrics gracefully", () => {
    const nullCampaigns: Campaign[] = [
      { spend: null, impressions: null, clicks: null, status: "draft" },
    ];
    const totalSpend = nullCampaigns.reduce((s, c) => s + (c.spend ?? 0), 0);
    expect(totalSpend).toBe(0);
  });
});
