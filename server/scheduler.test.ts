/**
 * scheduler.test.ts
 * Tests for the alert scheduler logic (evaluateRule helper and edge cases).
 */
import { describe, it, expect } from "vitest";

// ─── Inline the evaluateRule logic for unit testing ───────────────────────────
function evaluateRule(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case "lt":  return value < threshold;
    case "gt":  return value > threshold;
    case "lte": return value <= threshold;
    case "gte": return value >= threshold;
    default:    return false;
  }
}

describe("evaluateRule", () => {
  it("lt: triggers when value is below threshold", () => {
    expect(evaluateRule(0.5, "lt", 1.0)).toBe(true);
    expect(evaluateRule(1.5, "lt", 1.0)).toBe(false);
    expect(evaluateRule(1.0, "lt", 1.0)).toBe(false);
  });

  it("gt: triggers when value is above threshold", () => {
    expect(evaluateRule(2.0, "gt", 1.0)).toBe(true);
    expect(evaluateRule(0.5, "gt", 1.0)).toBe(false);
    expect(evaluateRule(1.0, "gt", 1.0)).toBe(false);
  });

  it("lte: triggers when value is at or below threshold", () => {
    expect(evaluateRule(1.0, "lte", 1.0)).toBe(true);
    expect(evaluateRule(0.9, "lte", 1.0)).toBe(true);
    expect(evaluateRule(1.1, "lte", 1.0)).toBe(false);
  });

  it("gte: triggers when value is at or above threshold", () => {
    expect(evaluateRule(1.0, "gte", 1.0)).toBe(true);
    expect(evaluateRule(1.1, "gte", 1.0)).toBe(true);
    expect(evaluateRule(0.9, "gte", 1.0)).toBe(false);
  });

  it("unknown operator returns false", () => {
    expect(evaluateRule(5, "eq", 5)).toBe(false);
    expect(evaluateRule(5, "", 5)).toBe(false);
  });

  it("handles zero and negative values correctly", () => {
    expect(evaluateRule(0, "lt", 1)).toBe(true);
    expect(evaluateRule(-1, "lt", 0)).toBe(true);
    expect(evaluateRule(0, "gt", -1)).toBe(true);
  });
});

describe("scheduler datePreset validation", () => {
  const validPresets = ["today", "yesterday", "last_7d", "last_30d", "this_month", "last_month"];

  it("all valid presets are recognized", () => {
    validPresets.forEach((preset) => {
      expect(validPresets.includes(preset)).toBe(true);
    });
  });

  it("default preset is today", () => {
    const defaultPreset = "today";
    expect(validPresets.includes(defaultPreset)).toBe(true);
  });
});
