/**
 * server/__tests__/aiAgent.test.ts
 * Tests for the AI Agent service — tool definitions, tool execution, and system prompt.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AI_AGENT_TOOLS, executeTool, SYSTEM_PROMPT } from "../app/services/aiAgent";

// ── Mock DB helpers ───────────────────────────────────────────────────────────
vi.mock("../app/db/campaigns", () => ({
  getUserCampaigns: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: "Summer Sale",
      platform: "facebook",
      status: "active",
      objective: "conversions",
      budget: "500",
      budget_type: "daily",
      start_date: "2026-01-01",
      end_date: "2026-06-30",
      created_at: new Date("2026-01-01"),
    },
    {
      id: 2,
      name: "Brand Awareness",
      platform: "instagram",
      status: "paused",
      objective: "brand_awareness",
      budget: "200",
      budget_type: "lifetime",
      start_date: "2026-02-01",
      end_date: null,
      created_at: new Date("2026-02-01"),
    },
  ]),
  getCampaignMetrics: vi.fn().mockResolvedValue([
    { date: "2026-03-01", impressions: 1000, clicks: 50, spend: "25.00", reach: 800, conversions: 5 },
    { date: "2026-03-02", impressions: 1200, clicks: 60, spend: "30.00", reach: 900, conversions: 8 },
  ]),
  createCampaign: vi.fn().mockResolvedValue({
    id: 3,
    name: "Test Campaign",
    platform: "tiktok",
    status: "draft",
    budget: "100",
  }),
}));

vi.mock("../app/db/social", () => ({
  getUserSocialAccounts: vi.fn().mockResolvedValue([
    { id: 1, platform: "facebook", name: "My Page", username: "mypage", is_active: true },
    { id: 2, platform: "instagram", name: "My IG", username: "myig", is_active: true },
  ]),
}));

vi.mock("../app/db/posts", () => ({
  getUserPosts: vi.fn().mockResolvedValue([
    {
      id: 1,
      title: "Hello World",
      content: "First post content",
      platforms: ["facebook"],
      status: "published",
      scheduled_at: null,
      published_at: new Date("2026-03-01"),
    },
    {
      id: 2,
      title: "Upcoming Post",
      content: "Scheduled content",
      platforms: ["instagram"],
      status: "scheduled",
      scheduled_at: new Date("2026-04-01"),
      published_at: null,
    },
  ]),
}));

vi.mock("../app/db/workspaces", () => ({
  getUserWorkspaces: vi.fn().mockResolvedValue([
    { id: 1, name: "My Workspace", plan: "pro" },
  ]),
  getBrandProfile: vi.fn().mockResolvedValue({
    brand_name: "TestBrand",
    brand_desc: "A test brand",
    tone: "professional",
    industry: "technology",
    language: "en",
    keywords: ["tech", "innovation"],
    avoid_words: ["cheap"],
    brand_colors: ["#000000", "#FFFFFF"],
    website_url: "https://testbrand.com",
  }),
}));

vi.mock("../../_core/imageGeneration", () => ({
  generateImage: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/generated-image.png" }),
}));

// Also mock at the path the service file actually imports from
vi.mock("../_core/imageGeneration", () => ({
  generateImage: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/generated-image.png" }),
}));

vi.mock("../../supabase", () => ({
  getSupabase: vi.fn(),
}));

vi.mock("../app/db/users", () => ({
  upsertUserBySupabaseUid: vi.fn(),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AI Agent Tools", () => {
  describe("Tool Definitions", () => {
    it("should define all expected tools", () => {
      const toolNames = AI_AGENT_TOOLS.map(t => t.function.name);
      expect(toolNames).toContain("get_campaigns");
      expect(toolNames).toContain("get_campaign_metrics");
      expect(toolNames).toContain("get_social_accounts");
      expect(toolNames).toContain("get_posts");
      expect(toolNames).toContain("get_marketing_overview");
      expect(toolNames).toContain("create_campaign");
      expect(toolNames).toContain("generate_ad_image");
      expect(toolNames).toContain("get_brand_profile");
    });

    it("should have valid tool type 'function' for all tools", () => {
      for (const tool of AI_AGENT_TOOLS) {
        expect(tool.type).toBe("function");
      }
    });

    it("should have descriptions for all tools", () => {
      for (const tool of AI_AGENT_TOOLS) {
        expect(tool.function.description).toBeTruthy();
        expect(typeof tool.function.description).toBe("string");
      }
    });

    it("should have parameters defined for all tools", () => {
      for (const tool of AI_AGENT_TOOLS) {
        expect(tool.function.parameters).toBeDefined();
        expect(tool.function.parameters?.type).toBe("object");
      }
    });
  });

  describe("Tool Execution", () => {
    const userId = 1;

    it("get_campaigns returns campaign list", async () => {
      const result = await executeTool("get_campaigns", {}, userId);
      const parsed = JSON.parse(result);
      expect(parsed.total).toBe(2);
      expect(parsed.campaigns).toHaveLength(2);
      expect(parsed.campaigns[0].name).toBe("Summer Sale");
    });

    it("get_campaigns filters by status", async () => {
      const result = await executeTool("get_campaigns", { status_filter: "active" }, userId);
      const parsed = JSON.parse(result);
      expect(parsed.total).toBe(1);
      expect(parsed.campaigns[0].status).toBe("active");
    });

    it("get_campaign_metrics returns aggregated metrics", async () => {
      const result = await executeTool("get_campaign_metrics", { campaign_id: 1 }, userId);
      const parsed = JSON.parse(result);
      expect(parsed.totals).toBeDefined();
      expect(parsed.totals.impressions).toBe(2200);
      expect(parsed.totals.clicks).toBe(110);
      expect(parsed.totals.spend).toBe("55.00");
      expect(parsed.totals.ctr).toContain("%");
    });

    it("get_social_accounts returns account list", async () => {
      const result = await executeTool("get_social_accounts", {}, userId);
      const parsed = JSON.parse(result);
      expect(parsed.total).toBe(2);
      expect(parsed.accounts[0].platform).toBe("facebook");
    });

    it("get_posts returns post list", async () => {
      const result = await executeTool("get_posts", {}, userId);
      const parsed = JSON.parse(result);
      expect(parsed.total).toBe(2);
      expect(parsed.posts[0].title).toBe("Hello World");
    });

    it("get_posts filters by status", async () => {
      const result = await executeTool("get_posts", { status_filter: "scheduled" }, userId);
      const parsed = JSON.parse(result);
      expect(parsed.total).toBe(1);
      expect(parsed.posts[0].status).toBe("scheduled");
    });

    it("get_marketing_overview returns aggregated data", async () => {
      const result = await executeTool("get_marketing_overview", {}, userId);
      const parsed = JSON.parse(result);
      expect(parsed.total_campaigns).toBe(2);
      expect(parsed.active_campaigns).toBe(1);
      expect(parsed.total_posts).toBe(2);
      expect(parsed.scheduled_posts).toBe(1);
      expect(parsed.connected_accounts).toBe(2);
      expect(parsed.workspace).toBeDefined();
      expect(parsed.workspace.name).toBe("My Workspace");
    });

    it("create_campaign creates and returns campaign", async () => {
      const result = await executeTool("create_campaign", {
        name: "Test Campaign",
        platform: "tiktok",
      }, userId);
      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.campaign.name).toBe("Test Campaign");
      expect(parsed.campaign.platform).toBe("tiktok");
    });

    it("generate_ad_image returns image URL", async () => {
      const result = await executeTool("generate_ad_image", {
        prompt: "A beautiful sunset ad",
      }, userId);
      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.image_url).toContain("https://");
    });

    it("get_brand_profile returns brand data", async () => {
      const result = await executeTool("get_brand_profile", {}, userId);
      const parsed = JSON.parse(result);
      expect(parsed.brand).toBeDefined();
      expect(parsed.brand.brand_name).toBe("TestBrand");
      expect(parsed.brand.industry).toBe("technology");
    });

    it("unknown tool returns error", async () => {
      const result = await executeTool("nonexistent_tool", {}, userId);
      const parsed = JSON.parse(result);
      expect(parsed.error).toContain("Unknown tool");
    });
  });

  describe("System Prompt", () => {
    it("should contain Generative UI instructions", () => {
      expect(SYSTEM_PROMPT).toContain("ui-block");
      expect(SYSTEM_PROMPT).toContain("metric_card");
      expect(SYSTEM_PROMPT).toContain("data_table");
      expect(SYSTEM_PROMPT).toContain("bar_chart");
      expect(SYSTEM_PROMPT).toContain("campaign_summary");
      expect(SYSTEM_PROMPT).toContain("suggestion_chips");
    });

    it("should contain tool usage instructions", () => {
      expect(SYSTEM_PROMPT).toContain("ALWAYS use tools");
      expect(SYSTEM_PROMPT).toContain("generate_ad_image");
    });

    it("should contain language instructions", () => {
      expect(SYSTEM_PROMPT).toContain("Arabic");
      expect(SYSTEM_PROMPT).toContain("English");
    });

    it("should contain role description", () => {
      expect(SYSTEM_PROMPT).toContain("Dashfields AI");
      expect(SYSTEM_PROMPT).toContain("Marketing Director");
    });
  });
});
