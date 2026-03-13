/**
 * topbarLayout.test.ts — Tests for the new Topbar layout architecture.
 * Validates routing config, navigation items, and component structure.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const CLIENT_SRC = path.resolve(__dirname, "../../client/src");

describe("Topbar Layout Architecture", () => {
  describe("File structure", () => {
    it("GlobalTopbar component exists", () => {
      const filePath = path.join(CLIENT_SRC, "app/components/layout/GlobalTopbar.tsx");
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it("TopbarLayout component exists", () => {
      const filePath = path.join(CLIENT_SRC, "app/components/layout/TopbarLayout.tsx");
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it("CreditUsageBar component exists", () => {
      const filePath = path.join(CLIENT_SRC, "app/components/layout/CreditUsageBar.tsx");
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it("HomePage exists in features/home/", () => {
      const filePath = path.join(CLIENT_SRC, "app/features/home/HomePage.tsx");
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it("All four widget components exist", () => {
      const widgets = [
        "ActionableIdeasWidget.tsx",
        "TrendingNewsWidget.tsx",
        "QuickSnapshotWidget.tsx",
        "RecentCreationsWidget.tsx",
      ];
      for (const w of widgets) {
        const filePath = path.join(CLIENT_SRC, "app/features/home/widgets", w);
        expect(fs.existsSync(filePath), `Missing widget: ${w}`).toBe(true);
      }
    });

    it("DashStudiosPage placeholder exists", () => {
      const filePath = path.join(CLIENT_SRC, "app/features/studios/DashStudiosPage.tsx");
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it("AssetsPage placeholder exists", () => {
      const filePath = path.join(CLIENT_SRC, "app/features/assets/AssetsPage.tsx");
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  describe("App.tsx routing", () => {
    const appContent = fs.readFileSync(path.join(CLIENT_SRC, "App.tsx"), "utf-8");

    it("imports TopbarLayout instead of DashboardLayout", () => {
      expect(appContent).toContain("TopbarLayout");
      // DashboardLayout should NOT be imported as the main layout
      expect(appContent).not.toMatch(/import DashboardLayout from/);
    });

    it("forces dark theme", () => {
      expect(appContent).toContain('defaultTheme="dark"');
    });

    it("registers /dashboard route to HomePage", () => {
      expect(appContent).toContain("HomePage");
      expect(appContent).toMatch(/path="\/dashboard".*component=\{HomePage\}/s);
    });

    it("registers /assist route to AIAgentPage", () => {
      expect(appContent).toContain("AIAgentPage");
      expect(appContent).toMatch(/path="\/assist".*component=\{AIAgentPage\}/s);
    });

    it("registers /studios route to DashStudiosPage", () => {
      expect(appContent).toContain("DashStudiosPage");
      expect(appContent).toMatch(/path="\/studios".*component=\{DashStudiosPage\}/s);
    });

    it("registers /assets route to AssetsPage", () => {
      expect(appContent).toContain("AssetsPage");
      expect(appContent).toMatch(/path="\/assets".*component=\{AssetsPage\}/s);
    });
  });

  describe("Dark mode CSS", () => {
    const cssContent = fs.readFileSync(path.join(CLIENT_SRC, "index.css"), "utf-8");

    it("uses dark gray background (not pitch black)", () => {
      // Background should be around oklch(0.215) — dark gray (#1A1919), not oklch(0) black
      expect(cssContent).toMatch(/--color-background:\s+oklch\(0\.21/);
    });

    it("defines glass utility for dark mode", () => {
      expect(cssContent).toContain(".glass");
      expect(cssContent).toContain("backdrop-filter");
    });

    it("defines app-bg with subtle gradient", () => {
      expect(cssContent).toContain(".app-bg");
      expect(cssContent).toContain("radial-gradient");
    });

    it("uses Inter font as primary", () => {
      expect(cssContent).toMatch(/--font-sans:.*"Inter"/);
    });
  });

  describe("GlobalTopbar navigation", () => {
    const topbarContent = fs.readFileSync(
      path.join(CLIENT_SRC, "app/components/layout/GlobalTopbar.tsx"),
      "utf-8"
    );

    it("has Home nav item", () => {
      expect(topbarContent).toContain('"Home"');
    });

    it("has Assist nav item", () => {
      expect(topbarContent).toContain('"Assist"');
    });

    it("has Dash Studios nav item (SVG logo)", () => {
      // Dash Studios is now rendered as an SVG logo component, not text
      expect(topbarContent).toContain("DashStudiosLogo");
      expect(topbarContent).toContain("/studios");
    });

    it("has Marketing dropdown with sub-items", () => {
      expect(topbarContent).toContain("Marketing");
      expect(topbarContent).toContain("Campaigns");
      expect(topbarContent).toContain("Content");
      expect(topbarContent).toContain("Analytics");
      expect(topbarContent).toContain("Reports");
    });

    it("has Assets nav item", () => {
      expect(topbarContent).toContain("Assets");
    });

    it("has user menu with required sections", () => {
      expect(topbarContent).toContain("Credit");
      expect(topbarContent).toContain("Buy more credits");
      expect(topbarContent).toContain("Workspaces");
      expect(topbarContent).toContain("View Profile");
      expect(topbarContent).toContain("Settings");
      expect(topbarContent).toContain("Sign Out");
    });

    it("all UI text is in English", () => {
      // Should not contain Arabic characters
      expect(topbarContent).not.toMatch(/[\u0600-\u06FF]/);
    });
  });

  describe("Widget components", () => {
    const widgetDir = path.join(CLIENT_SRC, "app/features/home/widgets");

    it("ActionableIdeasWidget has marketing prompts", () => {
      const content = fs.readFileSync(path.join(widgetDir, "ActionableIdeasWidget.tsx"), "utf-8");
      expect(content).toContain("Actionable Ideas");
      // Should have at least 3 ideas
      const ideaMatches = content.match(/label:/g);
      expect(ideaMatches!.length).toBeGreaterThanOrEqual(3);
    });

    it("TrendingNewsWidget has events", () => {
      const content = fs.readFileSync(path.join(widgetDir, "TrendingNewsWidget.tsx"), "utf-8");
      expect(content).toContain("Trending");
      expect(content).toContain("title:");
    });

    it("QuickSnapshotWidget has metrics", () => {
      const content = fs.readFileSync(path.join(widgetDir, "QuickSnapshotWidget.tsx"), "utf-8");
      expect(content).toContain("Quick Snapshot");
      expect(content).toContain("Active Campaigns");
    });

    it("RecentCreationsWidget has gallery items", () => {
      const content = fs.readFileSync(path.join(widgetDir, "RecentCreationsWidget.tsx"), "utf-8");
      expect(content).toContain("Recent Creations");
      expect(content).toContain("image");
    });
  });
});
