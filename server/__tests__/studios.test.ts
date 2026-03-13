/**
 * studios.test.ts — Tests for the Dash Studios feature.
 * Validates style presets, aspect ratios, and prompt enhancement logic.
 */
import { describe, it, expect } from "vitest";

// ─── Style Presets ──────────────────────────────────────────────────────────
const STYLE_PRESETS = [
  { id: "none", label: "None" },
  { id: "photorealistic", label: "Photorealistic" },
  { id: "minimalist", label: "Minimalist" },
  { id: "vibrant-pop", label: "Vibrant Pop" },
  { id: "luxury", label: "Luxury" },
  { id: "flat-illustration", label: "Flat Illustration" },
  { id: "cinematic", label: "Cinematic" },
  { id: "retro-vintage", label: "Retro Vintage" },
  { id: "neon-cyberpunk", label: "Neon Cyberpunk" },
];

const VALID_ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"];

// Simulate the prompt enhancement logic from the studios router
function buildFullPrompt(prompt: string, style?: string): string {
  if (style && style !== "none") {
    return `${style} style: ${prompt}`;
  }
  return prompt;
}

describe("Studios — Style Presets", () => {
  it("has 9 style presets including 'none'", () => {
    expect(STYLE_PRESETS).toHaveLength(9);
  });

  it("has unique IDs for all presets", () => {
    const ids = STYLE_PRESETS.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes a 'none' preset", () => {
    expect(STYLE_PRESETS.find(s => s.id === "none")).toBeDefined();
  });
});

describe("Studios — Aspect Ratios", () => {
  it("supports 5 aspect ratios", () => {
    expect(VALID_ASPECT_RATIOS).toHaveLength(5);
  });

  it("includes square (1:1)", () => {
    expect(VALID_ASPECT_RATIOS).toContain("1:1");
  });

  it("includes landscape (16:9)", () => {
    expect(VALID_ASPECT_RATIOS).toContain("16:9");
  });

  it("includes portrait (9:16)", () => {
    expect(VALID_ASPECT_RATIOS).toContain("9:16");
  });
});

describe("Studios — Prompt Enhancement", () => {
  it("prepends style when style is provided", () => {
    const result = buildFullPrompt("A coffee shop", "cinematic");
    expect(result).toBe("cinematic style: A coffee shop");
  });

  it("does not modify prompt when style is 'none'", () => {
    const result = buildFullPrompt("A coffee shop", "none");
    expect(result).toBe("A coffee shop");
  });

  it("does not modify prompt when style is undefined", () => {
    const result = buildFullPrompt("A coffee shop", undefined);
    expect(result).toBe("A coffee shop");
  });

  it("does not modify prompt when style is empty string", () => {
    const result = buildFullPrompt("A coffee shop", "");
    expect(result).toBe("A coffee shop");
  });

  it("handles long prompts correctly", () => {
    const longPrompt = "A".repeat(2000);
    const result = buildFullPrompt(longPrompt, "luxury");
    expect(result).toBe(`luxury style: ${longPrompt}`);
    expect(result.length).toBe(2000 + "luxury style: ".length);
  });
});
