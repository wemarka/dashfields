/**
 * atlas-api.test.ts
 * Validates Atlas Cloud API Key and connectivity for text + image generation.
 */
import { describe, it, expect } from "vitest";

const ATLAS_BASE_URL = "https://api.atlascloud.ai/v1";

describe("Atlas Cloud API", () => {
  it("should have ATLAS_API_KEY set", () => {
    const key = process.env.ATLAS_API_KEY;
    expect(key).toBeDefined();
    expect(key).not.toBe("");
    expect(key?.startsWith("apikey-")).toBe(true);
  });

  it("should successfully call chat completions with Gemini Flash Lite 3.1", async () => {
    const key = process.env.ATLAS_API_KEY;
    const response = await fetch(`${ATLAS_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "user", content: "Say 'Atlas OK' and nothing else." },
        ],
        max_tokens: 20,
        temperature: 0,
      }),
    });

    expect(response.ok).toBe(true);
    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    expect(data.choices).toBeDefined();
    expect(data.choices.length).toBeGreaterThan(0);
    expect(data.choices[0].message.content).toBeTruthy();
  }, 30000);
});
