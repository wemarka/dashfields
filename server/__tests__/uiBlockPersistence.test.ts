/**
 * Tests for UI block persistence — ensures generated_image_url survives
 * the round-trip: content string → DB → parseUIBlocks → CampaignPreview.
 */
import { describe, it, expect } from "vitest";

// We test the same regex-based patching logic used in handleBlockUpdate
// and the parseUIBlocks function.

// ── Inline copies of the two pure functions (no React deps) ──────────────

function parseUIBlocks(content: string): { text: string; blocks: Array<Record<string, unknown>> } {
  const blocks: Array<Record<string, unknown>> = [];
  const text = content.replace(/```ui-block\s*\n([\s\S]*?)```/g, (_match: string, json: string) => {
    try {
      const parsed = JSON.parse(json.trim());
      if (Array.isArray(parsed)) {
        blocks.push(...parsed);
      } else if (parsed && typeof parsed === "object" && parsed.type) {
        blocks.push(parsed);
      }
    } catch {
      // skip
    }
    return "";
  });
  return { text: text.trim(), blocks };
}

/** Mirrors the patchContent helper in handleBlockUpdate */
function patchContent(
  content: string,
  blockIndex: number,
  generatedImageUrl: string,
): string {
  let cpIdx = 0;
  return content.replace(/```ui-block\s*\n([\s\S]*?)```/g, (match: string, json: string) => {
    try {
      const parsed = JSON.parse(json.trim());
      if (parsed.type === "campaign_preview") {
        if (cpIdx === blockIndex) {
          parsed.generated_image_url = generatedImageUrl;
          cpIdx++;
          return "```ui-block\n" + JSON.stringify(parsed) + "\n```";
        }
        cpIdx++;
      }
    } catch { /* skip */ }
    return match;
  });
}

// ── Test data ────────────────────────────────────────────────────────────

const CAMPAIGN_BLOCK_JSON = JSON.stringify({
  type: "campaign_preview",
  campaign_name: "حملة رمضان",
  platform: "instagram",
  image_prompt_idea: "A beautiful Ramadan themed ad",
  headline: "عروض رمضان",
});

const CAMPAIGN_BLOCK_WITH_URL_JSON = JSON.stringify({
  type: "campaign_preview",
  campaign_name: "حملة رمضان",
  platform: "instagram",
  image_prompt_idea: "A beautiful Ramadan themed ad",
  headline: "عروض رمضان",
  generated_image_url: "https://cdn.example.com/image-123.png",
});

const METRIC_BLOCK_JSON = JSON.stringify({
  type: "metric_card",
  title: "CTR",
  value: "3.2%",
});

const CONTENT_NO_URL = `Here is your campaign preview:

\`\`\`ui-block
${CAMPAIGN_BLOCK_JSON}
\`\`\`

Hope you like it!`;

const CONTENT_WITH_URL = `Here is your campaign preview:

\`\`\`ui-block
${CAMPAIGN_BLOCK_WITH_URL_JSON}
\`\`\`

Hope you like it!`;

const CONTENT_MIXED = `Overview:

\`\`\`ui-block
${METRIC_BLOCK_JSON}
\`\`\`

And your campaign:

\`\`\`ui-block
${CAMPAIGN_BLOCK_JSON}
\`\`\``;

// ── Tests ────────────────────────────────────────────────────────────────

describe("parseUIBlocks", () => {
  it("parses campaign_preview block from content string", () => {
    const { blocks } = parseUIBlocks(CONTENT_NO_URL);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("campaign_preview");
    expect(blocks[0].campaign_name).toBe("حملة رمضان");
  });

  it("preserves generated_image_url when present in content", () => {
    const { blocks } = parseUIBlocks(CONTENT_WITH_URL);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("campaign_preview");
    expect(blocks[0].generated_image_url).toBe("https://cdn.example.com/image-123.png");
  });

  it("strips ui-block fences from display text", () => {
    const { text } = parseUIBlocks(CONTENT_NO_URL);
    expect(text).not.toContain("ui-block");
    expect(text).toContain("Hope you like it!");
    expect(text).toContain("Here is your campaign preview:");
  });

  it("handles mixed block types", () => {
    const { blocks } = parseUIBlocks(CONTENT_MIXED);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("metric_card");
    expect(blocks[1].type).toBe("campaign_preview");
  });
});

describe("patchContent (handleBlockUpdate helper)", () => {
  it("injects generated_image_url into campaign_preview block in content string", () => {
    const patched = patchContent(CONTENT_NO_URL, 0, "https://cdn.example.com/new-image.png");
    expect(patched).toContain("generated_image_url");
    expect(patched).toContain("https://cdn.example.com/new-image.png");
  });

  it("round-trips correctly: patch → parseUIBlocks → block has URL", () => {
    const patched = patchContent(CONTENT_NO_URL, 0, "https://cdn.example.com/round-trip.png");
    const { blocks } = parseUIBlocks(patched);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].generated_image_url).toBe("https://cdn.example.com/round-trip.png");
  });

  it("only patches the targeted block index in mixed content", () => {
    // Block index 0 is metric_card, block index 1 is campaign_preview
    // But patchContent counts only campaign_preview blocks, so cpIdx 0 = first campaign_preview
    const patched = patchContent(CONTENT_MIXED, 0, "https://cdn.example.com/mixed.png");
    const { blocks } = parseUIBlocks(patched);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("metric_card");
    expect((blocks[0] as Record<string, unknown>).generated_image_url).toBeUndefined();
    expect(blocks[1].type).toBe("campaign_preview");
    expect(blocks[1].generated_image_url).toBe("https://cdn.example.com/mixed.png");
  });

  it("does not modify content when no campaign_preview block exists", () => {
    const onlyMetric = `\`\`\`ui-block\n${METRIC_BLOCK_JSON}\n\`\`\``;
    const patched = patchContent(onlyMetric, 0, "https://cdn.example.com/noop.png");
    expect(patched).toBe(onlyMetric);
  });

  it("preserves existing generated_image_url when re-patching", () => {
    // First patch
    const first = patchContent(CONTENT_NO_URL, 0, "https://cdn.example.com/first.png");
    // Second patch (overwrite)
    const second = patchContent(first, 0, "https://cdn.example.com/second.png");
    const { blocks } = parseUIBlocks(second);
    expect(blocks[0].generated_image_url).toBe("https://cdn.example.com/second.png");
  });
});

describe("DB round-trip simulation", () => {
  it("simulates: generate image → save to DB → load from DB → image URL preserved", () => {
    // Step 1: AI generates content without image URL
    const originalContent = CONTENT_NO_URL;

    // Step 2: Image generation completes, handleBlockUpdate patches content
    const patchedContent = patchContent(originalContent, 0, "https://cdn.example.com/s3-image.png");

    // Step 3: Content is saved to DB (only content string, no uiBlocks)
    const dbMessage = {
      id: "msg-1",
      role: "assistant",
      content: patchedContent,
    };

    // Step 4: Load from DB and parse blocks
    const { blocks, text } = parseUIBlocks(dbMessage.content);

    // Verify: image URL is preserved
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("campaign_preview");
    expect(blocks[0].generated_image_url).toBe("https://cdn.example.com/s3-image.png");
    expect(blocks[0].image_prompt_idea).toBe("A beautiful Ramadan themed ad");

    // Verify: display text is clean
    expect(text).not.toContain("ui-block");
    expect(text).toContain("Here is your campaign preview:");
  });
});
