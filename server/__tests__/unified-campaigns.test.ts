// unified-campaigns.test.ts
// Tests for the unified campaign data transformation and filtering logic
// used in the redesigned Campaigns page.
import { describe, it, expect } from "vitest";

// ── Types matching the frontend UnifiedCampaign interface ─────────────────────
interface UnifiedCampaign {
  id: string;
  name: string;
  status: string;
  platform: string;
  source: "api" | "local";
  objective?: string | null;
  dailyBudget?: number | null;
  lifetimeBudget?: number | null;
  spend?: number | null;
  impressions?: number | null;
  clicks?: number | null;
  ctr?: number | null;
  reach?: number | null;
  accountName?: string;
  adAccountId?: string;
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const mockMetaCampaigns = [
  { id: "mc1", name: "Summer Sale", status: "ACTIVE", objective: "OUTCOME_SALES", dailyBudget: 50, lifetimeBudget: null, accountName: "Account A", adAccountId: "act_123" },
  { id: "mc2", name: "Brand Awareness", status: "PAUSED", objective: "OUTCOME_AWARENESS", dailyBudget: null, lifetimeBudget: 1000, accountName: "Account B", adAccountId: "act_456" },
  { id: "mc3", name: "Lead Gen", status: "ACTIVE", objective: "OUTCOME_LEADS", dailyBudget: 30, lifetimeBudget: null, accountName: "Account A", adAccountId: "act_123" },
];

const mockMetaInsights = [
  { campaignId: "mc1", spend: 250.50, impressions: 15000, clicks: 450, ctr: 3.0 },
  { campaignId: "mc2", spend: 100.00, impressions: 8000, clicks: 120, ctr: 1.5 },
  // mc3 has no insights
];

const mockLocalCampaigns = [
  { id: 1, name: "Email Campaign", status: "active", platform: "local", objective: "engagement", budget: "100" },
  { id: 2, name: "TikTok Promo", status: "draft", platform: "tiktok", objective: "traffic", budget: "200" },
  { id: 3, name: "LinkedIn Ads", status: "paused", platform: "linkedin", objective: "leads", budget: "500" },
];

// ── Transformation function (mirrors Campaigns.tsx logic) ─────────────────────
function buildUnifiedCampaigns(
  metaCampaigns: typeof mockMetaCampaigns,
  metaInsights: typeof mockMetaInsights,
  localCampaigns: typeof mockLocalCampaigns,
): UnifiedCampaign[] {
  const result: UnifiedCampaign[] = [];

  for (const mc of metaCampaigns) {
    const insight = metaInsights.find((i) => i.campaignId === mc.id);
    result.push({
      id: mc.id,
      name: mc.name,
      status: mc.status?.toLowerCase() ?? "unknown",
      platform: "facebook",
      source: "api",
      objective: mc.objective,
      dailyBudget: mc.dailyBudget,
      lifetimeBudget: mc.lifetimeBudget,
      spend: insight ? Number(insight.spend) : null,
      impressions: insight ? Number(insight.impressions) : null,
      clicks: insight ? Number(insight.clicks) : null,
      ctr: insight ? Number(insight.ctr) : null,
      reach: null,
      accountName: mc.accountName,
      adAccountId: mc.adAccountId,
    });
  }

  for (const lc of localCampaigns) {
    result.push({
      id: String(lc.id),
      name: lc.name ?? "Untitled",
      status: lc.status ?? "draft",
      platform: lc.platform ?? "local",
      source: "local",
      objective: lc.objective,
      dailyBudget: lc.budget ? Number(lc.budget) : null,
      lifetimeBudget: null,
      spend: null,
      impressions: null,
      clicks: null,
      ctr: null,
      reach: null,
      accountName: undefined,
      adAccountId: undefined,
    });
  }

  return result;
}

// ── Filter function (mirrors Campaigns.tsx logic) ─────────────────────────────
function filterCampaigns(
  campaigns: UnifiedCampaign[],
  search: string,
  statusFilter: string,
  platformFilter: string,
): UnifiedCampaign[] {
  return campaigns.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (platformFilter !== "all") {
      if (platformFilter === "local" && c.source !== "local") return false;
      if (platformFilter !== "local" && c.platform !== platformFilter) return false;
    }
    return true;
  });
}

// ── KPI aggregation function (mirrors Campaigns.tsx logic) ────────────────────
function aggregateKpis(campaigns: UnifiedCampaign[]) {
  const totalSpend = campaigns.reduce((s, c) => s + (c.spend ?? 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions ?? 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks ?? 0), 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;
  return { totalSpend, totalImpressions, totalClicks, avgCtr, activeCampaigns };
}

// ── Sort function (mirrors UnifiedCampaignTable.tsx logic) ────────────────────
function sortCampaigns(
  campaigns: UnifiedCampaign[],
  sortKey: string,
  sortDir: "asc" | "desc",
): UnifiedCampaign[] {
  const arr = [...campaigns];
  arr.sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "name":        cmp = (a.name ?? "").localeCompare(b.name ?? ""); break;
      case "status":      cmp = (a.status ?? "").localeCompare(b.status ?? ""); break;
      case "platform":    cmp = (a.platform ?? "").localeCompare(b.platform ?? ""); break;
      case "spend":       cmp = (a.spend ?? 0) - (b.spend ?? 0); break;
      case "impressions": cmp = (a.impressions ?? 0) - (b.impressions ?? 0); break;
      case "clicks":      cmp = (a.clicks ?? 0) - (b.clicks ?? 0); break;
      case "ctr":         cmp = (a.ctr ?? 0) - (b.ctr ?? 0); break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });
  return arr;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("Unified Campaign Data Transformation", () => {
  const unified = buildUnifiedCampaigns(mockMetaCampaigns, mockMetaInsights, mockLocalCampaigns);

  it("merges Meta and local campaigns into a single list", () => {
    expect(unified).toHaveLength(6); // 3 meta + 3 local
  });

  it("normalizes Meta campaign status to lowercase", () => {
    const metaCampaigns = unified.filter(c => c.source === "api");
    metaCampaigns.forEach(c => {
      expect(c.status).toMatch(/^[a-z]+$/);
    });
  });

  it("marks Meta campaigns as source=api and local as source=local", () => {
    const apiCampaigns = unified.filter(c => c.source === "api");
    const localCampaigns = unified.filter(c => c.source === "local");
    expect(apiCampaigns).toHaveLength(3);
    expect(localCampaigns).toHaveLength(3);
  });

  it("assigns platform=facebook to all Meta campaigns", () => {
    const metaCampaigns = unified.filter(c => c.source === "api");
    metaCampaigns.forEach(c => {
      expect(c.platform).toBe("facebook");
    });
  });

  it("preserves local campaign platform values", () => {
    const local = unified.filter(c => c.source === "local");
    expect(local.map(c => c.platform).sort()).toEqual(["linkedin", "local", "tiktok"]);
  });

  it("merges insights into Meta campaigns correctly", () => {
    const mc1 = unified.find(c => c.id === "mc1");
    expect(mc1?.spend).toBe(250.50);
    expect(mc1?.impressions).toBe(15000);
    expect(mc1?.clicks).toBe(450);
    expect(mc1?.ctr).toBe(3.0);
  });

  it("sets null insights for Meta campaigns without data", () => {
    const mc3 = unified.find(c => c.id === "mc3");
    expect(mc3?.spend).toBeNull();
    expect(mc3?.impressions).toBeNull();
    expect(mc3?.clicks).toBeNull();
  });

  it("converts local campaign budget to dailyBudget number", () => {
    const emailCampaign = unified.find(c => c.name === "Email Campaign");
    expect(emailCampaign?.dailyBudget).toBe(100);
  });

  it("preserves accountName for Meta campaigns", () => {
    const mc1 = unified.find(c => c.id === "mc1");
    expect(mc1?.accountName).toBe("Account A");
    const mc2 = unified.find(c => c.id === "mc2");
    expect(mc2?.accountName).toBe("Account B");
  });
});

describe("Unified Campaign Filtering", () => {
  const unified = buildUnifiedCampaigns(mockMetaCampaigns, mockMetaInsights, mockLocalCampaigns);

  it("returns all campaigns when no filters are applied", () => {
    const filtered = filterCampaigns(unified, "", "all", "all");
    expect(filtered).toHaveLength(6);
  });

  it("filters by search text (case insensitive)", () => {
    const filtered = filterCampaigns(unified, "summer", "all", "all");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("Summer Sale");
  });

  it("filters by status", () => {
    const filtered = filterCampaigns(unified, "", "active", "all");
    expect(filtered).toHaveLength(3); // 2 meta active + 1 local active
  });

  it("filters by platform (facebook)", () => {
    const filtered = filterCampaigns(unified, "", "all", "facebook");
    expect(filtered).toHaveLength(3); // all meta campaigns
  });

  it("filters by platform (local)", () => {
    const filtered = filterCampaigns(unified, "", "all", "local");
    expect(filtered).toHaveLength(3); // all local campaigns
  });

  it("combines search + status filters", () => {
    const filtered = filterCampaigns(unified, "brand", "paused", "all");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("Brand Awareness");
  });

  it("combines all filters together", () => {
    const filtered = filterCampaigns(unified, "lead", "active", "facebook");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("Lead Gen");
  });

  it("returns empty array when no campaigns match", () => {
    const filtered = filterCampaigns(unified, "nonexistent", "all", "all");
    expect(filtered).toHaveLength(0);
  });
});

describe("KPI Aggregation", () => {
  const unified = buildUnifiedCampaigns(mockMetaCampaigns, mockMetaInsights, mockLocalCampaigns);

  it("calculates total spend across all campaigns", () => {
    const kpis = aggregateKpis(unified);
    expect(kpis.totalSpend).toBeCloseTo(350.50, 2);
  });

  it("calculates total impressions", () => {
    const kpis = aggregateKpis(unified);
    expect(kpis.totalImpressions).toBe(23000);
  });

  it("calculates total clicks", () => {
    const kpis = aggregateKpis(unified);
    expect(kpis.totalClicks).toBe(570);
  });

  it("calculates average CTR correctly", () => {
    const kpis = aggregateKpis(unified);
    // CTR = (570 / 23000) * 100 = 2.478...
    expect(kpis.avgCtr).toBeCloseTo(2.478, 2);
  });

  it("counts active campaigns", () => {
    const kpis = aggregateKpis(unified);
    expect(kpis.activeCampaigns).toBe(3); // 2 meta active + 1 local active
  });

  it("handles empty campaign list", () => {
    const kpis = aggregateKpis([]);
    expect(kpis.totalSpend).toBe(0);
    expect(kpis.totalImpressions).toBe(0);
    expect(kpis.totalClicks).toBe(0);
    expect(kpis.avgCtr).toBe(0);
    expect(kpis.activeCampaigns).toBe(0);
  });

  it("handles campaigns with null metrics", () => {
    const nullCampaigns: UnifiedCampaign[] = [
      { id: "1", name: "Test", status: "active", platform: "local", source: "local", spend: null, impressions: null, clicks: null, ctr: null },
    ];
    const kpis = aggregateKpis(nullCampaigns);
    expect(kpis.totalSpend).toBe(0);
    expect(kpis.avgCtr).toBe(0);
  });
});

describe("Campaign Sorting", () => {
  const unified = buildUnifiedCampaigns(mockMetaCampaigns, mockMetaInsights, mockLocalCampaigns);

  it("sorts by spend descending (default)", () => {
    const sorted = sortCampaigns(unified, "spend", "desc");
    expect(sorted[0].name).toBe("Summer Sale"); // 250.50
    expect(sorted[1].name).toBe("Brand Awareness"); // 100.00
  });

  it("sorts by spend ascending", () => {
    const sorted = sortCampaigns(unified, "spend", "asc");
    // Null spend = 0, so local campaigns come first
    const firstThreeSpends = sorted.slice(0, 3).map(c => c.spend ?? 0);
    firstThreeSpends.forEach(s => expect(s).toBe(0));
  });

  it("sorts by name alphabetically", () => {
    const sorted = sortCampaigns(unified, "name", "asc");
    expect(sorted[0].name).toBe("Brand Awareness");
    expect(sorted[sorted.length - 1].name).toBe("TikTok Promo");
  });

  it("sorts by platform", () => {
    const sorted = sortCampaigns(unified, "platform", "asc");
    expect(sorted[0].platform).toBe("facebook");
    expect(sorted[sorted.length - 1].platform).toBe("tiktok");
  });

  it("sorts by impressions descending", () => {
    const sorted = sortCampaigns(unified, "impressions", "desc");
    expect(sorted[0].impressions).toBe(15000);
    expect(sorted[1].impressions).toBe(8000);
  });

  it("does not mutate the original array", () => {
    const original = [...unified];
    sortCampaigns(unified, "spend", "desc");
    expect(unified).toEqual(original);
  });
});

describe("Edge Cases", () => {
  it("handles empty Meta campaigns list", () => {
    const unified = buildUnifiedCampaigns([], [], mockLocalCampaigns);
    expect(unified).toHaveLength(3);
    expect(unified.every(c => c.source === "local")).toBe(true);
  });

  it("handles empty local campaigns list", () => {
    const unified = buildUnifiedCampaigns(mockMetaCampaigns, mockMetaInsights, []);
    expect(unified).toHaveLength(3);
    expect(unified.every(c => c.source === "api")).toBe(true);
  });

  it("handles both lists empty", () => {
    const unified = buildUnifiedCampaigns([], [], []);
    expect(unified).toHaveLength(0);
  });

  it("handles campaign with missing name", () => {
    const campaigns = buildUnifiedCampaigns([], [], [
      { id: 99, name: undefined as any, status: "draft", platform: "local", objective: null, budget: null as any },
    ]);
    expect(campaigns[0].name).toBe("Untitled");
  });

  it("handles campaign with missing status", () => {
    const campaigns = buildUnifiedCampaigns([], [], [
      { id: 99, name: "Test", status: undefined as any, platform: "local", objective: null, budget: null as any },
    ]);
    expect(campaigns[0].status).toBe("draft");
  });
});
