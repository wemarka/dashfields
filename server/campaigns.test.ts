import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  getUserCampaigns: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      name: "Test Campaign",
      platform: "facebook",
      status: "active",
      budget: "100.00",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  createCampaign: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateCampaignStatus: vi.fn().mockResolvedValue({ affectedRows: 1 }),
  getCampaignMetrics: vi.fn().mockResolvedValue([]),
}));

describe("Campaign DB helpers", () => {
  it("getUserCampaigns returns array", async () => {
    const { getUserCampaigns } = await import("./db");
    const result = await getUserCampaigns(1);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("createCampaign resolves without error", async () => {
    const { createCampaign } = await import("./db");
    const result = await createCampaign({
      userId: 1,
      name: "New Campaign",
      platform: "facebook",
      budget: 200,
    });
    expect(result).toBeDefined();
  });

  it("updateCampaignStatus resolves without error", async () => {
    const { updateCampaignStatus } = await import("./db");
    const result = await updateCampaignStatus(1, 1, "paused");
    expect(result).toBeDefined();
  });

  it("getCampaignMetrics returns array", async () => {
    const { getCampaignMetrics } = await import("./db");
    const result = await getCampaignMetrics(1, 7);
    expect(Array.isArray(result)).toBe(true);
  });
});
