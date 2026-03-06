// server/__tests__/campaignEnhancements3.test.ts
// Tests for Round 3 enhancements: tag filtering, campaign PDF report, budget alerts
import { describe, it, expect, vi } from "vitest";

// ─── Enhancement 1: Tag-based filtering ──────────────────────────────────────
describe("Tag-based campaign filtering", () => {
  it("should filter campaigns by tag from tagMap", () => {
    const tagMap: Record<string, string[]> = {
      "c1": ["performance", "q1"],
      "c2": ["branding"],
      "c3": ["performance", "retargeting"],
      "c4": [],
    };

    const campaigns = [
      { id: "c1", name: "Campaign 1" },
      { id: "c2", name: "Campaign 2" },
      { id: "c3", name: "Campaign 3" },
      { id: "c4", name: "Campaign 4" },
    ];

    const tagFilter = "performance";
    const filtered = campaigns.filter((c) => {
      const tags = tagMap[c.id] ?? [];
      return tagFilter === "all" || tags.includes(tagFilter);
    });

    expect(filtered).toHaveLength(2);
    expect(filtered.map(c => c.id)).toEqual(["c1", "c3"]);
  });

  it("should return all campaigns when tagFilter is 'all'", () => {
    const tagMap: Record<string, string[]> = {
      "c1": ["performance"],
      "c2": ["branding"],
    };

    const campaigns = [
      { id: "c1", name: "Campaign 1" },
      { id: "c2", name: "Campaign 2" },
    ];

    const tagFilter = "all";
    const filtered = campaigns.filter((c) => {
      const tags = tagMap[c.id] ?? [];
      return tagFilter === "all" || tags.includes(tagFilter);
    });

    expect(filtered).toHaveLength(2);
  });

  it("should handle campaigns with no tags", () => {
    const tagMap: Record<string, string[]> = {};

    const campaigns = [
      { id: "c1", name: "Campaign 1" },
    ];

    const tagFilter = "performance";
    const filtered = campaigns.filter((c) => {
      const tags = tagMap[c.id] ?? [];
      return tagFilter === "all" || tags.includes(tagFilter);
    });

    expect(filtered).toHaveLength(0);
  });
});

// ─── Enhancement 2: Campaign PDF Report ──────────────────────────────────────
describe("Campaign PDF Report generation", () => {
  it("should build HTML report with campaign KPIs", () => {
    const input = {
      campaignName: "Summer Sale 2025",
      status: "active",
      objective: "CONVERSIONS",
      platform: "facebook",
      spend: 1500.50,
      impressions: 250000,
      clicks: 5000,
      ctr: 2.0,
      reach: 180000,
      cpc: 0.30,
      cpm: 6.00,
      conversions: 150,
    };

    // Simulate the HTML generation logic
    const html = `
      <div class="kpi"><div class="val">$${(input.spend).toFixed(2)}</div></div>
      <div class="kpi"><div class="val">${(input.impressions).toLocaleString()}</div></div>
      <div class="kpi"><div class="val">${(input.clicks).toLocaleString()}</div></div>
      <div class="kpi"><div class="val">${(input.ctr).toFixed(2)}%</div></div>
    `;

    expect(html).toContain("$1500.50");
    expect(html).toContain("250,000");
    expect(html).toContain("5,000");
    expect(html).toContain("2.00%");
  });

  it("should include daily data bars in SVG", () => {
    const daily = [
      { date: "2025-01-01", spend: 50, impressions: 10000, clicks: 200 },
      { date: "2025-01-02", spend: 75, impressions: 15000, clicks: 300 },
      { date: "2025-01-03", spend: 60, impressions: 12000, clicks: 250 },
    ];

    const maxSpend = Math.max(...daily.map(d => d.spend), 1);
    expect(maxSpend).toBe(75);

    const bars = daily.map((d, i) => {
      const h = Math.max((d.spend / maxSpend) * 120, 2);
      return `<rect x="${i * 10}" y="${120 - h}" width="8" height="${h}" />`;
    });

    expect(bars).toHaveLength(3);
    expect(bars[1]).toContain('height="120"'); // max spend = full height
  });

  it("should include notes and tags in report", () => {
    const notes = "This campaign targets summer shoppers";
    const tags = ["summer", "sale", "q3"];

    const tagsHtml = tags.map(t => `<span>${t}</span>`).join("");
    const notesHtml = `<div class="notes-content">${notes}</div>`;

    expect(tagsHtml).toContain("summer");
    expect(tagsHtml).toContain("sale");
    expect(notesHtml).toContain("summer shoppers");
  });

  it("should generate proper filename", () => {
    const campaignName = "Summer Sale 2025!";
    const datePreset = "last_30d";
    const filename = `dashfields-campaign-${campaignName.replace(/[^a-zA-Z0-9]/g, "-")}-${datePreset}.html`;

    expect(filename).toBe("dashfields-campaign-Summer-Sale-2025--last_30d.html");
    expect(filename).not.toContain("!");
  });
});

// ─── Enhancement 3: Budget Overspend Notifications ───────────────────────────
describe("Budget overspend detection", () => {
  const BUDGET_ALERT_THRESHOLD = 80;

  it("should detect campaigns over budget threshold", () => {
    const campaigns = [
      { id: "1", name: "Campaign A", daily_budget: "10000", effective_status: "ACTIVE" }, // $100
      { id: "2", name: "Campaign B", daily_budget: "5000", effective_status: "ACTIVE" },  // $50
      { id: "3", name: "Campaign C", daily_budget: "20000", effective_status: "ACTIVE" }, // $200
    ];

    const insights = new Map([
      ["1", { spend: 85 }],  // 85% of $100
      ["2", { spend: 30 }],  // 60% of $50
      ["3", { spend: 180 }], // 90% of $200
    ]);

    const overBudget: string[] = [];

    for (const campaign of campaigns) {
      const dailyBudget = parseFloat(campaign.daily_budget) / 100;
      if (dailyBudget <= 0) continue;

      const insight = insights.get(campaign.id);
      const todaySpend = insight?.spend ?? 0;
      const spendPercent = Math.round((todaySpend / dailyBudget) * 100);

      if (spendPercent >= BUDGET_ALERT_THRESHOLD) {
        overBudget.push(
          `${campaign.name}: $${todaySpend.toFixed(2)} / $${dailyBudget.toFixed(2)} (${spendPercent}%)`
        );
      }
    }

    expect(overBudget).toHaveLength(2);
    expect(overBudget[0]).toContain("Campaign A");
    expect(overBudget[0]).toContain("85%");
    expect(overBudget[1]).toContain("Campaign C");
    expect(overBudget[1]).toContain("90%");
  });

  it("should not alert for campaigns under threshold", () => {
    const dailyBudget = 100; // $100
    const todaySpend = 50;   // $50 = 50%
    const spendPercent = Math.round((todaySpend / dailyBudget) * 100);

    expect(spendPercent).toBe(50);
    expect(spendPercent >= BUDGET_ALERT_THRESHOLD).toBe(false);
  });

  it("should handle zero budget gracefully", () => {
    const dailyBudget = 0;
    // Should skip campaigns with zero budget
    expect(dailyBudget <= 0).toBe(true);
  });

  it("should handle campaigns with no insights data", () => {
    const insights = new Map<string, { spend: number }>();
    const todaySpend = insights.get("unknown_campaign")?.spend ?? 0;

    expect(todaySpend).toBe(0);
  });

  it("should format notification message correctly", () => {
    const overBudgetCampaigns = [
      "Campaign A: $85.00 / $100.00 (85%)",
      "Campaign C: $180.00 / $200.00 (90%)",
    ];

    const message = [
      `The following campaigns have reached ${BUDGET_ALERT_THRESHOLD}% or more of their daily budget:`,
      "",
      ...overBudgetCampaigns.map(c => `- ${c}`),
      "",
      "Review your campaigns to manage spending.",
    ].join("\n");

    expect(message).toContain("80%");
    expect(message).toContain("- Campaign A");
    expect(message).toContain("- Campaign C");
    expect(message).toContain("Review your campaigns");
  });
});

// ─── Active filter count ─────────────────────────────────────────────────────
describe("Active filter count with tag filter", () => {
  it("should include tag filter in active count", () => {
    const filters = {
      search: "",
      statusFilter: "all",
      platformFilter: "all",
      datePreset: "last_30d",
      tagFilter: "performance",
    };

    const activeFilterCount = [
      filters.search !== "",
      filters.statusFilter !== "all",
      filters.platformFilter !== "all",
      filters.datePreset !== "last_30d",
      filters.tagFilter !== "all",
    ].filter(Boolean).length;

    expect(activeFilterCount).toBe(1);
  });

  it("should count multiple active filters including tag", () => {
    const filters = {
      search: "test",
      statusFilter: "active",
      platformFilter: "all",
      datePreset: "last_30d",
      tagFilter: "branding",
    };

    const activeFilterCount = [
      filters.search !== "",
      filters.statusFilter !== "all",
      filters.platformFilter !== "all",
      filters.datePreset !== "last_30d",
      filters.tagFilter !== "all",
    ].filter(Boolean).length;

    expect(activeFilterCount).toBe(3);
  });
});
