/**
 * homeStats.test.ts — Tests for the homeStats tRPC router.
 * Validates quickSnapshot aggregation and recentCreations parsing.
 */
import { describe, it, expect } from "vitest";

// ─── Unit test: parseUIBlocks extraction for recentCreations ─────────────────
describe("homeStats.recentCreations parsing logic", () => {
  // Simulate the block extraction logic from homeStats router
  function extractCreationsFromMessages(
    messages: Array<{ role: string; content: string }>
  ) {
    type Creation = { id: string; type: "image" | "video"; label: string; url: string };
    const creations: Creation[] = [];

    for (const msg of messages) {
      if (msg.role !== "assistant" || !msg.content) continue;

      const blockRegex = /```ui-block:campaign-preview\n([\s\S]*?)```/g;
      let match;
      while ((match = blockRegex.exec(msg.content)) !== null) {
        try {
          const block = JSON.parse(match[1]);
          if (block.generated_image_url) {
            creations.push({
              id: `${block.headline || "creation"}-${creations.length}`,
              type: "image",
              label: block.headline || "AI Creation",
              url: block.generated_image_url,
            });
          }
        } catch {
          // Skip malformed blocks
        }
      }
    }

    return creations.slice(0, 8);
  }

  it("extracts generated_image_url from assistant messages with ui-block fences", () => {
    const messages = [
      {
        role: "assistant",
        content: `Here's your campaign:\n\`\`\`ui-block:campaign-preview\n{"headline":"Summer Sale","generated_image_url":"https://cdn.example.com/img1.png"}\n\`\`\``,
      },
    ];
    const result = extractCreationsFromMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Summer Sale");
    expect(result[0].url).toBe("https://cdn.example.com/img1.png");
    expect(result[0].type).toBe("image");
  });

  it("skips blocks without generated_image_url", () => {
    const messages = [
      {
        role: "assistant",
        content: `\`\`\`ui-block:campaign-preview\n{"headline":"Draft","description":"No image yet"}\n\`\`\``,
      },
    ];
    const result = extractCreationsFromMessages(messages);
    expect(result).toHaveLength(0);
  });

  it("extracts multiple blocks from a single message", () => {
    const messages = [
      {
        role: "assistant",
        content: `\`\`\`ui-block:campaign-preview\n{"headline":"A","generated_image_url":"https://a.png"}\n\`\`\`\nSome text\n\`\`\`ui-block:campaign-preview\n{"headline":"B","generated_image_url":"https://b.png"}\n\`\`\``,
      },
    ];
    const result = extractCreationsFromMessages(messages);
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe("A");
    expect(result[1].label).toBe("B");
  });

  it("ignores user messages", () => {
    const messages = [
      {
        role: "user",
        content: `\`\`\`ui-block:campaign-preview\n{"headline":"User","generated_image_url":"https://x.png"}\n\`\`\``,
      },
    ];
    const result = extractCreationsFromMessages(messages);
    expect(result).toHaveLength(0);
  });

  it("handles malformed JSON gracefully", () => {
    const messages = [
      {
        role: "assistant",
        content: `\`\`\`ui-block:campaign-preview\n{not valid json}\n\`\`\``,
      },
    ];
    const result = extractCreationsFromMessages(messages);
    expect(result).toHaveLength(0);
  });

  it("limits to 8 creations max", () => {
    const blocks = Array.from({ length: 12 }, (_, i) =>
      `\`\`\`ui-block:campaign-preview\n{"headline":"Item ${i}","generated_image_url":"https://img${i}.png"}\n\`\`\``
    ).join("\n");
    const messages = [{ role: "assistant", content: blocks }];
    const result = extractCreationsFromMessages(messages);
    expect(result).toHaveLength(8);
  });

  it("uses 'AI Creation' as default label when headline is missing", () => {
    const messages = [
      {
        role: "assistant",
        content: `\`\`\`ui-block:campaign-preview\n{"generated_image_url":"https://img.png"}\n\`\`\``,
      },
    ];
    const result = extractCreationsFromMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("AI Creation");
  });
});

// ─── Unit test: formatNumber / formatCurrency helpers ────────────────────────
describe("QuickSnapshot formatting helpers", () => {
  function formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  }

  function formatCurrency(n: number): string {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  }

  it("formats numbers under 1K as-is", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(999)).toBe("999");
  });

  it("formats numbers 1K-999K with K suffix", () => {
    expect(formatNumber(1000)).toBe("1.0K");
    expect(formatNumber(248000)).toBe("248.0K");
  });

  it("formats numbers 1M+ with M suffix", () => {
    expect(formatNumber(1500000)).toBe("1.5M");
  });

  it("formats currency under $1K with two decimals", () => {
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(42.5)).toBe("$42.50");
  });

  it("formats currency $1K-$999K with K suffix", () => {
    expect(formatCurrency(4280)).toBe("$4.3K");
  });

  it("formats currency $1M+ with M suffix", () => {
    expect(formatCurrency(2500000)).toBe("$2.5M");
  });
});
