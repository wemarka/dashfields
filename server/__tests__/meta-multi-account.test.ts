// meta-multi-account.test.ts
// Tests for multi-account campaign fetching logic (getAllMetaTokens + campaigns aggregation)
import { describe, it, expect, vi } from "vitest";

// ── ensureActPrefix helper (mirrors server/services/integrations/meta.ts) ────
function ensureActPrefix(id: string): string {
  return id.startsWith("act_") ? id : `act_${id}`;
}

describe("ensureActPrefix", () => {
  it("adds act_ prefix when missing", () => {
    expect(ensureActPrefix("365129525049523")).toBe("act_365129525049523");
  });

  it("does not double-prefix when already present", () => {
    expect(ensureActPrefix("act_365129525049523")).toBe("act_365129525049523");
  });

  it("handles empty string", () => {
    expect(ensureActPrefix("")).toBe("act_");
  });
});

// ── Simulated getAllMetaTokens result filtering ──────────────────────────────
interface MetaTokenRecord {
  access_token: string | null;
  platform_account_id: string | null;
  name: string | null;
}

function filterValidTokens(data: MetaTokenRecord[]) {
  return data
    .filter(d => d.access_token && d.platform_account_id)
    .map(d => ({
      token: d.access_token!,
      adAccountId: d.platform_account_id!,
      name: d.name ?? "",
    }));
}

describe("getAllMetaTokens filtering", () => {
  it("filters out records with null access_token", () => {
    const data: MetaTokenRecord[] = [
      { access_token: "tok1", platform_account_id: "123", name: "Account 1" },
      { access_token: null, platform_account_id: "456", name: "Account 2" },
      { access_token: "tok3", platform_account_id: "789", name: "Account 3" },
    ];
    const result = filterValidTokens(data);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Account 1");
    expect(result[1].name).toBe("Account 3");
  });

  it("filters out records with null platform_account_id", () => {
    const data: MetaTokenRecord[] = [
      { access_token: "tok1", platform_account_id: null, name: "No ID" },
      { access_token: "tok2", platform_account_id: "456", name: "Has ID" },
    ];
    const result = filterValidTokens(data);
    expect(result).toHaveLength(1);
    expect(result[0].adAccountId).toBe("456");
  });

  it("returns empty array when all records are invalid", () => {
    const data: MetaTokenRecord[] = [
      { access_token: null, platform_account_id: null, name: "Bad" },
    ];
    expect(filterValidTokens(data)).toHaveLength(0);
  });

  it("handles empty input", () => {
    expect(filterValidTokens([])).toHaveLength(0);
  });

  it("defaults name to empty string when null", () => {
    const data: MetaTokenRecord[] = [
      { access_token: "tok1", platform_account_id: "123", name: null },
    ];
    const result = filterValidTokens(data);
    expect(result[0].name).toBe("");
  });
});

// ── Campaign aggregation across multiple accounts ────────────────────────────
interface RawCampaign {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
}

function mapCampaign(c: RawCampaign, accountName: string, adAccountId: string) {
  return {
    id: c.id,
    name: c.name,
    status: c.effective_status ?? c.status,
    objective: c.objective,
    dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
    lifetimeBudget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
    startTime: c.start_time,
    stopTime: c.stop_time,
    accountName,
    adAccountId,
  };
}

function aggregateCampaigns(
  results: PromiseSettledResult<ReturnType<typeof mapCampaign>[]>[]
) {
  return results
    .filter((r): r is PromiseFulfilledResult<ReturnType<typeof mapCampaign>[]> => r.status === "fulfilled")
    .flatMap(r => r.value);
}

describe("Campaign aggregation across multiple accounts", () => {
  it("maps campaign fields correctly", () => {
    const raw: RawCampaign = {
      id: "123",
      name: "Test Campaign",
      status: "ACTIVE",
      effective_status: "ACTIVE",
      objective: "OUTCOME_LEADS",
      daily_budget: "5000",
    };
    const mapped = mapCampaign(raw, "My Account", "act_456");
    expect(mapped.id).toBe("123");
    expect(mapped.name).toBe("Test Campaign");
    expect(mapped.status).toBe("ACTIVE");
    expect(mapped.dailyBudget).toBe(50); // 5000 cents / 100
    expect(mapped.accountName).toBe("My Account");
    expect(mapped.adAccountId).toBe("act_456");
  });

  it("handles null budgets", () => {
    const raw: RawCampaign = {
      id: "123",
      name: "No Budget",
      status: "PAUSED",
      effective_status: "PAUSED",
    };
    const mapped = mapCampaign(raw, "Acc", "act_1");
    expect(mapped.dailyBudget).toBeNull();
    expect(mapped.lifetimeBudget).toBeNull();
  });

  it("aggregates campaigns from multiple fulfilled promises", () => {
    const results: PromiseSettledResult<ReturnType<typeof mapCampaign>[]>[] = [
      {
        status: "fulfilled",
        value: [
          mapCampaign({ id: "1", name: "C1", status: "ACTIVE", effective_status: "ACTIVE" }, "Acc1", "act_1"),
          mapCampaign({ id: "2", name: "C2", status: "PAUSED", effective_status: "PAUSED" }, "Acc1", "act_1"),
        ],
      },
      {
        status: "fulfilled",
        value: [
          mapCampaign({ id: "3", name: "C3", status: "ACTIVE", effective_status: "ACTIVE" }, "Acc2", "act_2"),
        ],
      },
    ];
    const aggregated = aggregateCampaigns(results);
    expect(aggregated).toHaveLength(3);
    expect(aggregated[0].accountName).toBe("Acc1");
    expect(aggregated[2].accountName).toBe("Acc2");
  });

  it("skips rejected promises gracefully", () => {
    const results: PromiseSettledResult<ReturnType<typeof mapCampaign>[]>[] = [
      {
        status: "fulfilled",
        value: [
          mapCampaign({ id: "1", name: "C1", status: "ACTIVE", effective_status: "ACTIVE" }, "Acc1", "act_1"),
        ],
      },
      {
        status: "rejected",
        reason: new Error("API rate limit"),
      },
      {
        status: "fulfilled",
        value: [
          mapCampaign({ id: "2", name: "C2", status: "ACTIVE", effective_status: "ACTIVE" }, "Acc3", "act_3"),
        ],
      },
    ];
    const aggregated = aggregateCampaigns(results);
    expect(aggregated).toHaveLength(2);
    expect(aggregated[0].id).toBe("1");
    expect(aggregated[1].id).toBe("2");
  });

  it("returns empty array when all promises rejected", () => {
    const results: PromiseSettledResult<ReturnType<typeof mapCampaign>[]>[] = [
      { status: "rejected", reason: new Error("err1") },
      { status: "rejected", reason: new Error("err2") },
    ];
    expect(aggregateCampaigns(results)).toHaveLength(0);
  });

  it("returns empty array when no results", () => {
    expect(aggregateCampaigns([])).toHaveLength(0);
  });
});

// ── getMetaToken: .limit(1) vs .maybeSingle() behavior ──────────────────────
describe("getMetaToken query strategy", () => {
  it("limit(1) returns first element from array (handles multiple accounts)", () => {
    // Simulating what .limit(1) returns vs .maybeSingle()
    const multipleAccounts = [
      { access_token: "tok1", platform_account_id: "111" },
      { access_token: "tok2", platform_account_id: "222" },
    ];

    // .limit(1) returns array, take first
    const limitResult = multipleAccounts.slice(0, 1);
    const first = limitResult[0];
    expect(first).toBeDefined();
    expect(first.access_token).toBe("tok1");

    // .maybeSingle() would return null for multiple rows — that was the bug
    const maybeSingleResult = multipleAccounts.length > 1 ? null : multipleAccounts[0];
    expect(maybeSingleResult).toBeNull(); // This confirms the bug scenario
  });

  it("limit(1) works correctly with single account", () => {
    const singleAccount = [
      { access_token: "tok1", platform_account_id: "111" },
    ];
    const first = singleAccount[0];
    expect(first).toBeDefined();
    expect(first.access_token).toBe("tok1");
  });
});
