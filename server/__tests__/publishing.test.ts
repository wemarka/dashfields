// publishing.test.ts
// Tests for publishing/posts helpers and data transformations.
import { describe, it, expect } from "vitest";

// ─── Helpers mirrored from PostCard ──────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-700",
  scheduled: "bg-blue-50 text-blue-700",
  draft:     "bg-slate-100 text-slate-600",
};

function getStatusStyle(status: string): string {
  return STATUS_STYLE[status] ?? STATUS_STYLE.draft;
}

// ─── Calendar helpers ─────────────────────────────────────────────────────────
function buildCalendarCells(year: number, month: number): (number | null)[] {
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
}

function groupPostsByDay(
  posts: Array<{ id: number; scheduled_at?: string | number | null }>,
  year: number,
  month: number
): Record<number, typeof posts> {
  const result: Record<number, typeof posts> = {};
  posts.forEach((p) => {
    const d = p.scheduled_at ? new Date(p.scheduled_at) : null;
    if (d && d.getMonth() === month && d.getFullYear() === year) {
      const day = d.getDate();
      result[day] = [...(result[day] ?? []), p];
    }
  });
  return result;
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("getStatusStyle", () => {
  it("returns correct class for published", () => {
    expect(getStatusStyle("published")).toContain("emerald");
  });
  it("returns correct class for scheduled", () => {
    expect(getStatusStyle("scheduled")).toContain("blue");
  });
  it("falls back to draft style for unknown status", () => {
    expect(getStatusStyle("unknown")).toBe(STATUS_STYLE.draft);
    expect(getStatusStyle("")).toBe(STATUS_STYLE.draft);
  });
});

describe("buildCalendarCells", () => {
  it("March 2026 starts on Sunday (0)", () => {
    const cells = buildCalendarCells(2026, 2); // month is 0-indexed
    expect(cells[0]).toBe(1); // March 1, 2026 is a Sunday
  });

  it("February 2026 has 28 days (non-leap year)", () => {
    const cells = buildCalendarCells(2026, 1);
    const days = cells.filter((c) => c !== null);
    expect(days.length).toBe(28);
  });

  it("total cells = leading nulls + days in month", () => {
    const cells = buildCalendarCells(2026, 2);
    const nullCount  = cells.filter((c) => c === null).length;
    const dayCount   = cells.filter((c) => c !== null).length;
    expect(dayCount).toBe(31); // March has 31 days
    expect(nullCount).toBeGreaterThanOrEqual(0);
  });
});

describe("groupPostsByDay", () => {
  const posts = [
    { id: 1, scheduled_at: "2026-03-05T10:00:00Z" },
    { id: 2, scheduled_at: "2026-03-05T14:00:00Z" },
    { id: 3, scheduled_at: "2026-03-15T09:00:00Z" },
    { id: 4, scheduled_at: null },
    { id: 5, scheduled_at: "2026-04-01T10:00:00Z" }, // different month
  ];

  it("groups posts by day correctly", () => {
    const grouped = groupPostsByDay(posts, 2026, 2); // March 2026
    expect(grouped[5]).toHaveLength(2);
    expect(grouped[15]).toHaveLength(1);
  });

  it("excludes posts from different months", () => {
    const grouped = groupPostsByDay(posts, 2026, 2);
    expect(grouped[1]).toBeUndefined(); // April 1 should not appear
  });

  it("excludes posts with null scheduled_at", () => {
    const grouped = groupPostsByDay(posts, 2026, 2);
    const allIds = Object.values(grouped).flat().map((p) => p.id);
    expect(allIds).not.toContain(4);
  });
});
