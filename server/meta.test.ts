/**
 * meta.test.ts
 * Tests for Meta Ads helper functions and data transformations.
 */
import { describe, it, expect } from "vitest";

// ── Date preset helpers ───────────────────────────────────────────────────────

function getDateRange(preset: string): { since: string; until: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  switch (preset) {
    case "today": {
      const s = fmt(now);
      return { since: s, until: s };
    }
    case "yesterday": {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      const s = fmt(d);
      return { since: s, until: s };
    }
    case "last_7d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { since: fmt(d), until: fmt(now) };
    }
    case "last_30d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { since: fmt(d), until: fmt(now) };
    }
    default: {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { since: fmt(d), until: fmt(now) };
    }
  }
}

describe("Meta date preset helpers", () => {
  it("returns same date for today preset", () => {
    const { since, until } = getDateRange("today");
    expect(since).toBe(until);
    expect(since).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns 7-day range for last_7d preset", () => {
    const { since, until } = getDateRange("last_7d");
    const diff = (new Date(until).getTime() - new Date(since).getTime()) / (1000 * 60 * 60 * 24);
    expect(diff).toBe(6);
  });

  it("returns 30-day range for last_30d preset", () => {
    const { since, until } = getDateRange("last_30d");
    const diff = (new Date(until).getTime() - new Date(since).getTime()) / (1000 * 60 * 60 * 24);
    expect(diff).toBe(29);
  });

  it("returns valid ISO date strings", () => {
    const { since, until } = getDateRange("last_30d");
    expect(since).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(until).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ── Insights data transformations ─────────────────────────────────────────────

interface RawInsight {
  spend: string;
  impressions: string;
  clicks: string;
  reach: string;
  ctr: string;
  cpc: string;
  cpm: string;
  frequency: string;
  actions?: Array<{ action_type: string; value: string }>;
}

function parseInsights(raw: RawInsight) {
  const getAction = (type: string) =>
    parseFloat(raw.actions?.find((a) => a.action_type === type)?.value ?? "0");

  return {
    spend:       parseFloat(raw.spend ?? "0"),
    impressions: parseInt(raw.impressions ?? "0", 10),
    clicks:      parseInt(raw.clicks ?? "0", 10),
    reach:       parseInt(raw.reach ?? "0", 10),
    ctr:         parseFloat(raw.ctr ?? "0"),
    cpc:         parseFloat(raw.cpc ?? "0"),
    cpm:         parseFloat(raw.cpm ?? "0"),
    frequency:   parseFloat(raw.frequency ?? "0"),
    leads:       getAction("lead"),
    messages:    getAction("onsite_conversion.messaging_conversation_started_7d"),
    calls:       getAction("call"),
  };
}

describe("Meta insights data parsing", () => {
  it("parses numeric fields correctly", () => {
    const raw: RawInsight = {
      spend: "123.45",
      impressions: "10000",
      clicks: "250",
      reach: "8000",
      ctr: "2.5",
      cpc: "0.49",
      cpm: "12.34",
      frequency: "1.25",
    };
    const parsed = parseInsights(raw);
    expect(parsed.spend).toBe(123.45);
    expect(parsed.impressions).toBe(10000);
    expect(parsed.clicks).toBe(250);
    expect(parsed.ctr).toBe(2.5);
  });

  it("extracts lead actions correctly", () => {
    const raw: RawInsight = {
      spend: "50",
      impressions: "5000",
      clicks: "100",
      reach: "4000",
      ctr: "2.0",
      cpc: "0.5",
      cpm: "10",
      frequency: "1.25",
      actions: [
        { action_type: "lead", value: "15" },
        { action_type: "call", value: "3" },
      ],
    };
    const parsed = parseInsights(raw);
    expect(parsed.leads).toBe(15);
    expect(parsed.calls).toBe(3);
    expect(parsed.messages).toBe(0);
  });

  it("handles missing actions gracefully", () => {
    const raw: RawInsight = {
      spend: "10",
      impressions: "1000",
      clicks: "20",
      reach: "900",
      ctr: "2.0",
      cpc: "0.5",
      cpm: "10",
      frequency: "1.1",
    };
    const parsed = parseInsights(raw);
    expect(parsed.leads).toBe(0);
    expect(parsed.messages).toBe(0);
    expect(parsed.calls).toBe(0);
  });
});
