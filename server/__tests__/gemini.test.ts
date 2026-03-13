/**
 * gemini.test.ts — Validates Google AI API Key and Gemini services
 */
import { describe, it, expect } from "vitest";
import { generateText } from "../app/services/gemini-text";

describe("Gemini API Key Validation", () => {
  it("should generate text using Gemini Flash Lite", async () => {
    const result = await generateText("Say 'API_OK' and nothing else.", {
      temperature: 0,
    });
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    console.log("[Gemini Test] Response:", result.substring(0, 50));
  }, 30000);
});
