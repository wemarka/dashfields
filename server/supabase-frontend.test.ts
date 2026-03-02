/**
 * supabase-frontend.test.ts
 * Validates that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set and reachable.
 */
import { describe, it, expect } from "vitest";

describe("Supabase frontend env vars", () => {
  it("VITE_SUPABASE_URL is set", () => {
    const url = process.env.VITE_SUPABASE_URL;
    expect(url).toBeDefined();
    expect(url).toMatch(/^https:\/\/.+\.supabase\.co$/);
  });

  it("VITE_SUPABASE_ANON_KEY is set", () => {
    const key = process.env.VITE_SUPABASE_ANON_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(20);
  });

  it("can reach Supabase REST endpoint with anon key", async () => {
    const url = process.env.VITE_SUPABASE_URL!;
    const key = process.env.VITE_SUPABASE_ANON_KEY!;
    const res = await fetch(`${url}/rest/v1/notifications?limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    // 200 or 206 means reachable; 401 means wrong key
    expect([200, 206, 400]).toContain(res.status);
  });
});
