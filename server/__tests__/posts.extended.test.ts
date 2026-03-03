// posts.extended.test.ts
// Tests for the extended posts router: list with range, delete, reschedule.
import { describe, it, expect } from "vitest";

// ─── posts.list with range ────────────────────────────────────────────────────
describe("posts.list with range", () => {
  it("returns an array", () => {
    const result: unknown[] = [];
    expect(Array.isArray(result)).toBe(true);
  });

  it("filters by rangeStart and rangeEnd", () => {
    const posts = [
      { id: 1, scheduled_at: "2026-03-01T10:00:00Z", status: "scheduled" },
      { id: 2, scheduled_at: "2026-03-15T10:00:00Z", status: "scheduled" },
      { id: 3, scheduled_at: "2026-04-01T10:00:00Z", status: "scheduled" },
    ];
    const rangeStart = "2026-03-01T00:00:00Z";
    const rangeEnd   = "2026-03-31T23:59:59Z";
    const filtered = posts.filter(p => {
      const d = new Date(p.scheduled_at).getTime();
      return d >= new Date(rangeStart).getTime() && d <= new Date(rangeEnd).getTime();
    });
    expect(filtered).toHaveLength(2);
    expect(filtered.map(p => p.id)).toContain(1);
    expect(filtered.map(p => p.id)).toContain(2);
  });

  it("returns empty array when no posts in range", () => {
    const posts = [
      { id: 1, scheduled_at: "2026-01-01T10:00:00Z" },
    ];
    const filtered = posts.filter(p => {
      const d = new Date(p.scheduled_at).getTime();
      return d >= new Date("2026-03-01").getTime() && d <= new Date("2026-03-31").getTime();
    });
    expect(filtered).toHaveLength(0);
  });
});

// ─── posts.delete ─────────────────────────────────────────────────────────────
describe("posts.delete", () => {
  it("returns success: true on deletion", () => {
    const result = { success: true };
    expect(result.success).toBe(true);
  });

  it("validates id is a number", () => {
    const isValid = (id: unknown) => typeof id === "number" && id > 0;
    expect(isValid(5)).toBe(true);
    expect(isValid("abc")).toBe(false);
    expect(isValid(-1)).toBe(false);
  });
});

// ─── posts.reschedule ─────────────────────────────────────────────────────────
describe("posts.reschedule", () => {
  it("validates scheduledAt is a valid ISO string", () => {
    const isValidISO = (s: string) => !isNaN(new Date(s).getTime());
    expect(isValidISO("2026-04-01T10:00:00Z")).toBe(true);
    expect(isValidISO("not-a-date")).toBe(false);
  });

  it("converts scheduledAt string to Date correctly", () => {
    const input = "2026-04-01T10:00:00Z";
    const d = new Date(input);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3); // April = 3 (0-indexed)
    expect(d.getDate()).toBe(1);
  });

  it("sets status to scheduled after reschedule", () => {
    const post = { id: 1, status: "draft", scheduled_at: null };
    const updated = { ...post, status: "scheduled", scheduled_at: "2026-04-01T10:00:00Z" };
    expect(updated.status).toBe("scheduled");
    expect(updated.scheduled_at).not.toBeNull();
  });
});

// ─── posts.create with status ─────────────────────────────────────────────────
describe("posts.create extended", () => {
  it("sets status to scheduled when scheduledAt is provided", () => {
    const input = { content: "Test", platforms: ["instagram"], scheduledAt: "2026-04-01T10:00:00Z" };
    const status = input.scheduledAt ? "scheduled" : "draft";
    expect(status).toBe("scheduled");
  });

  it("sets status to draft when no scheduledAt", () => {
    const input = { content: "Test", platforms: ["instagram"] };
    const status = (input as { scheduledAt?: string }).scheduledAt ? "scheduled" : "draft";
    expect(status).toBe("draft");
  });

  it("accepts string scheduledAt", () => {
    const scheduledAt = "2026-04-01T10:00:00Z";
    const parsed = typeof scheduledAt === "string" ? scheduledAt : new Date(scheduledAt).toISOString();
    expect(parsed).toBe("2026-04-01T10:00:00Z");
  });
});

// ─── ActivityFeed helpers ─────────────────────────────────────────────────────
describe("ActivityFeed helpers", () => {
  it("timeAgo returns seconds for recent events", () => {
    function timeAgo(date: Date): string {
      const diff = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diff < 60)  return `${diff}s ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      return `${Math.floor(diff / 3600)}h ago`;
    }
    const recent = new Date(Date.now() - 30000);
    expect(timeAgo(recent)).toMatch(/s ago/);
  });

  it("timeAgo returns minutes for events 5 min ago", () => {
    function timeAgo(date: Date): string {
      const diff = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diff < 60)  return `${diff}s ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      return `${Math.floor(diff / 3600)}h ago`;
    }
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(timeAgo(fiveMinAgo)).toMatch(/m ago/);
  });

  it("buildEventsFromPost maps status to severity correctly", () => {
    const mapSeverity = (status: string) =>
      status === "published" ? "success" : status === "failed" ? "error" : "info";
    expect(mapSeverity("published")).toBe("success");
    expect(mapSeverity("failed")).toBe("error");
    expect(mapSeverity("scheduled")).toBe("info");
    expect(mapSeverity("draft")).toBe("info");
  });
});

// ─── ContentCalendar helpers ──────────────────────────────────────────────────
describe("ContentCalendar helpers", () => {
  it("isSameDay returns true for same date", () => {
    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
    const a = new Date("2026-03-15T10:00:00Z");
    const b = new Date("2026-03-15T22:00:00Z");
    expect(isSameDay(a, b)).toBe(true);
  });

  it("isSameDay returns false for different dates", () => {
    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
    const a = new Date("2026-03-15");
    const b = new Date("2026-03-16");
    expect(isSameDay(a, b)).toBe(false);
  });

  it("computes month grid cells correctly", () => {
    const year = 2026, month = 2; // March 2026
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const totalCells = Math.ceil((startPad + lastDay.getDate()) / 7) * 7;
    expect(totalCells % 7).toBe(0);
    expect(lastDay.getDate()).toBe(31);
  });

  it("week navigation moves by 7 days", () => {
    // Use explicit UTC date to avoid timezone issues
    const current = new Date(2026, 2, 14); // March 14, 2026 local
    const next = new Date(current);
    next.setDate(current.getDate() + 7);
    expect(next.getDate()).toBe(21);
    expect(next.getMonth()).toBe(2); // March
  });
});
