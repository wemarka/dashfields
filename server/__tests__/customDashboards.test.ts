// customDashboards.test.ts
// Unit tests for Custom Dashboards logic — widget validation, layout helpers.
import { describe, it, expect } from "vitest";

// ─── Widget Schema Validation ─────────────────────────────────────────────────
interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  config?: Record<string, unknown>;
}

function validateWidget(w: Partial<DashboardWidget>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!w.id || typeof w.id !== "string" || w.id.trim() === "")
    errors.push("Widget id is required");
  if (!w.type || typeof w.type !== "string")
    errors.push("Widget type is required");
  if (!w.title || typeof w.title !== "string")
    errors.push("Widget title is required");
  if (typeof w.x !== "number" || w.x < 0)
    errors.push("Widget x must be >= 0");
  if (typeof w.y !== "number" || w.y < 0)
    errors.push("Widget y must be >= 0");
  if (typeof w.w !== "number" || w.w < 1 || w.w > 12)
    errors.push("Widget w must be 1–12");
  if (typeof w.h !== "number" || w.h < 1 || w.h > 8)
    errors.push("Widget h must be 1–8");
  return { valid: errors.length === 0, errors };
}

// ─── Layout Collision Detection ───────────────────────────────────────────────
function widgetsOverlap(a: DashboardWidget, b: DashboardWidget): boolean {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

function hasCollisions(widgets: DashboardWidget[]): boolean {
  for (let i = 0; i < widgets.length; i++) {
    for (let j = i + 1; j < widgets.length; j++) {
      if (widgetsOverlap(widgets[i], widgets[j])) return true;
    }
  }
  return false;
}

// ─── Dashboard Name Validation ────────────────────────────────────────────────
function validateDashboardName(name: string): boolean {
  return typeof name === "string" && name.trim().length >= 1 && name.trim().length <= 100;
}

// ─── Widget Catalog ───────────────────────────────────────────────────────────
const WIDGET_TYPES = [
  "impressions", "clicks", "spend", "ctr", "campaigns",
  "engagement", "reach", "trend", "platform_split", "top_campaign",
];

function isValidWidgetType(type: string): boolean {
  return WIDGET_TYPES.includes(type);
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("Widget validation", () => {
  it("validates a correct widget", () => {
    const { valid, errors } = validateWidget({
      id: "w1", type: "impressions", title: "Impressions",
      x: 0, y: 0, w: 4, h: 2,
    });
    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it("rejects widget with missing id", () => {
    const { valid, errors } = validateWidget({
      id: "", type: "clicks", title: "Clicks", x: 0, y: 0, w: 4, h: 2,
    });
    expect(valid).toBe(false);
    expect(errors).toContain("Widget id is required");
  });

  it("rejects widget with w > 12", () => {
    const { valid, errors } = validateWidget({
      id: "w2", type: "spend", title: "Spend", x: 0, y: 0, w: 13, h: 2,
    });
    expect(valid).toBe(false);
    expect(errors).toContain("Widget w must be 1–12");
  });

  it("rejects widget with h > 8", () => {
    const { valid, errors } = validateWidget({
      id: "w3", type: "ctr", title: "CTR", x: 0, y: 0, w: 4, h: 9,
    });
    expect(valid).toBe(false);
    expect(errors).toContain("Widget h must be 1–8");
  });

  it("rejects widget with negative x", () => {
    const { valid, errors } = validateWidget({
      id: "w4", type: "reach", title: "Reach", x: -1, y: 0, w: 4, h: 2,
    });
    expect(valid).toBe(false);
    expect(errors).toContain("Widget x must be >= 0");
  });

  it("accepts widget with optional config", () => {
    const { valid } = validateWidget({
      id: "w5", type: "trend", title: "Trend", x: 0, y: 2, w: 6, h: 3,
      config: { period: "7d", color: "blue" },
    });
    expect(valid).toBe(true);
  });
});

describe("Widget collision detection", () => {
  const w1: DashboardWidget = { id: "w1", type: "impressions", title: "A", x: 0, y: 0, w: 4, h: 2 };
  const w2: DashboardWidget = { id: "w2", type: "clicks",      title: "B", x: 4, y: 0, w: 4, h: 2 };
  const w3: DashboardWidget = { id: "w3", type: "spend",       title: "C", x: 2, y: 1, w: 4, h: 2 };

  it("detects no collision for side-by-side widgets", () => {
    expect(widgetsOverlap(w1, w2)).toBe(false);
  });

  it("detects collision for overlapping widgets", () => {
    expect(widgetsOverlap(w1, w3)).toBe(true);
  });

  it("hasCollisions returns false for clean layout", () => {
    expect(hasCollisions([w1, w2])).toBe(false);
  });

  it("hasCollisions returns true when overlap exists", () => {
    expect(hasCollisions([w1, w2, w3])).toBe(true);
  });

  it("handles single widget with no collisions", () => {
    expect(hasCollisions([w1])).toBe(false);
  });

  it("handles empty widget list", () => {
    expect(hasCollisions([])).toBe(false);
  });
});

describe("Dashboard name validation", () => {
  it("accepts valid names", () => {
    expect(validateDashboardName("My Dashboard")).toBe(true);
    expect(validateDashboardName("Q1 Performance")).toBe(true);
  });

  it("rejects empty name", () => {
    expect(validateDashboardName("")).toBe(false);
    expect(validateDashboardName("   ")).toBe(false);
  });

  it("rejects name longer than 100 chars", () => {
    expect(validateDashboardName("A".repeat(101))).toBe(false);
  });

  it("accepts name of exactly 100 chars", () => {
    expect(validateDashboardName("A".repeat(100))).toBe(true);
  });
});

describe("Widget type catalog", () => {
  it("has 10 widget types", () => {
    expect(WIDGET_TYPES).toHaveLength(10);
  });

  it("validates known widget types", () => {
    expect(isValidWidgetType("impressions")).toBe(true);
    expect(isValidWidgetType("platform_split")).toBe(true);
    expect(isValidWidgetType("top_campaign")).toBe(true);
  });

  it("rejects unknown widget types", () => {
    expect(isValidWidgetType("unknown_widget")).toBe(false);
    expect(isValidWidgetType("")).toBe(false);
  });
});
