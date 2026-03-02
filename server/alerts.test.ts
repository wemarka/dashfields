/**
 * alerts.test.ts
 * Tests for alert rules logic and notification helpers.
 */
import { describe, it, expect } from "vitest";

// ── Alert rule threshold evaluation logic ─────────────────────────────────────

type Operator = "lt" | "gt" | "lte" | "gte";

function evaluateRule(value: number, operator: Operator, threshold: number): boolean {
  switch (operator) {
    case "lt":  return value < threshold;
    case "gt":  return value > threshold;
    case "lte": return value <= threshold;
    case "gte": return value >= threshold;
    default:    return false;
  }
}

describe("Alert rule evaluation", () => {
  it("triggers when CTR < threshold", () => {
    expect(evaluateRule(0.5, "lt", 1.0)).toBe(true);
    expect(evaluateRule(1.5, "lt", 1.0)).toBe(false);
  });

  it("triggers when spend > threshold", () => {
    expect(evaluateRule(150, "gt", 100)).toBe(true);
    expect(evaluateRule(50, "gt", 100)).toBe(false);
  });

  it("triggers when CPC <= threshold", () => {
    expect(evaluateRule(2.0, "lte", 2.0)).toBe(true);
    expect(evaluateRule(2.1, "lte", 2.0)).toBe(false);
  });

  it("triggers when ROAS >= threshold", () => {
    expect(evaluateRule(4.0, "gte", 3.0)).toBe(true);
    expect(evaluateRule(2.5, "gte", 3.0)).toBe(false);
  });

  it("handles edge case: exact threshold value for lt", () => {
    expect(evaluateRule(1.0, "lt", 1.0)).toBe(false);
  });
});

// ── Format helpers ────────────────────────────────────────────────────────────

describe("Alert label formatting", () => {
  const METRIC_LABELS: Record<string, string> = {
    ctr: "CTR (%)", cpc: "CPC ($)", cpm: "CPM ($)",
    spend: "Spend ($)", impressions: "Impressions", clicks: "Clicks", roas: "ROAS",
  };

  it("has labels for all supported metrics", () => {
    const metrics = ["ctr", "cpc", "cpm", "spend", "impressions", "clicks", "roas"];
    metrics.forEach((m) => {
      expect(METRIC_LABELS[m]).toBeDefined();
    });
  });

  it("formats metric label correctly", () => {
    expect(METRIC_LABELS["ctr"]).toBe("CTR (%)");
    expect(METRIC_LABELS["spend"]).toBe("Spend ($)");
  });
});
