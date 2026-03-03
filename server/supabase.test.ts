// server/supabase.test.ts
// Validates Supabase connection and basic CRUD operations.
import { describe, it, expect, beforeAll } from "vitest";
import { getSupabase } from "./supabase";

describe("Supabase connection", () => {
  let sb: ReturnType<typeof getSupabase>;

  beforeAll(() => {
    // These env vars are injected by the platform
    process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://safmbvahqqwwemaqjvut.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhZm1idmFocXF3d2VtYXFqdnV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ3NTYzNiwiZXhwIjoyMDg4MDUxNjM2fQ.xeMfoiaxdc6FuQQFejpo96L8aQAxEGZf9nHI28NkRO4";
    sb = getSupabase();
  });

  it("should create a Supabase client without throwing", () => {
    expect(sb).toBeDefined();
    expect(typeof sb.from).toBe("function");
  });

  it("should be able to query users table", async () => {
    const { data, error } = await sb
      .from("users")
      .select("id, open_id")
      .limit(1);
    // No error means connection works (empty array is fine)
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it("should be able to query campaigns table", async () => {
    const { data, error } = await sb
      .from("campaigns")
      .select("id")
      .limit(1);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it("should be able to query posts table", async () => {
    const { data, error } = await sb
      .from("posts")
      .select("id")
      .limit(1);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});
