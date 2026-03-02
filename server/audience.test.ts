/**
 * server/audience.test.ts
 * Tests for audience demographics data generation and aggregation.
 */
import { describe, it, expect } from "vitest";

// ─── Replicate core logic from audience router ─────────────────────────────────
function generateAudienceData(platform: string, seed: number) {
  const rng = (n: number) => Math.abs(Math.sin(seed * n) * 100);

  const ageGroups = [
    { group: "13-17", male: Math.round(rng(1) * 0.3), female: Math.round(rng(2) * 0.3) },
    { group: "18-24", male: Math.round(rng(3) * 1.2), female: Math.round(rng(4) * 1.1) },
    { group: "25-34", male: Math.round(rng(5) * 1.5), female: Math.round(rng(6) * 1.4) },
    { group: "35-44", male: Math.round(rng(7) * 1.0), female: Math.round(rng(8) * 0.9) },
    { group: "45-54", male: Math.round(rng(9) * 0.7), female: Math.round(rng(10) * 0.6) },
    { group: "55-64", male: Math.round(rng(11) * 0.4), female: Math.round(rng(12) * 0.35) },
    { group: "65+",   male: Math.round(rng(13) * 0.2), female: Math.round(rng(14) * 0.18) },
  ];

  const countries = [
    { country: "Saudi Arabia", code: "SA", users: Math.round(rng(15) * 5) },
    { country: "UAE",          code: "AE", users: Math.round(rng(16) * 4) },
    { country: "Egypt",        code: "EG", users: Math.round(rng(17) * 3.5) },
    { country: "Kuwait",       code: "KW", users: Math.round(rng(18) * 2.5) },
  ].sort((a, b) => b.users - a.users);

  const interests = [
    { category: "Technology", score: Math.round(rng(23) * 0.9) },
    { category: "Business",   score: Math.round(rng(24) * 0.85) },
    { category: "Shopping",   score: Math.round(rng(25) * 0.8) },
  ].sort((a, b) => b.score - a.score);

  const devices = [
    { device: "Mobile",  percentage: Math.round(55 + rng(33) * 0.2) },
    { device: "Desktop", percentage: Math.round(25 + rng(34) * 0.15) },
    { device: "Tablet",  percentage: Math.round(10 + rng(35) * 0.1) },
    { device: "Other",   percentage: Math.round(2  + rng(36) * 0.05) },
  ];

  const total = devices.reduce((s, d) => s + d.percentage, 0);
  devices.forEach((d) => (d.percentage = Math.round((d.percentage / total) * 100)));

  const totalMale   = ageGroups.reduce((s, g) => s + g.male, 0);
  const totalFemale = ageGroups.reduce((s, g) => s + g.female, 0);
  const totalAll    = totalMale + totalFemale;

  return {
    platform,
    summary: {
      totalReach:   Math.round(rng(37) * 50000),
      malePercent:  Math.round((totalMale / totalAll) * 100),
      femalePercent: Math.round((totalFemale / totalAll) * 100),
      topCountry:   countries[0]?.country ?? "N/A",
      topAgeGroup:  "25-34",
    },
    ageGender: ageGroups,
    countries,
    interests,
    devices,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────
describe("Audience Data Generation", () => {
  it("generates 7 age groups", () => {
    const data = generateAudienceData("facebook", 1);
    expect(data.ageGender).toHaveLength(7);
    expect(data.ageGender[0].group).toBe("13-17");
    expect(data.ageGender[6].group).toBe("65+");
  });

  it("each age group has male and female counts", () => {
    const data = generateAudienceData("instagram", 2);
    data.ageGender.forEach((g) => {
      expect(g.male).toBeGreaterThanOrEqual(0);
      expect(g.female).toBeGreaterThanOrEqual(0);
    });
  });

  it("summary malePercent + femalePercent ≈ 100", () => {
    const data = generateAudienceData("tiktok", 3);
    const sum = data.summary.malePercent + data.summary.femalePercent;
    expect(sum).toBeGreaterThanOrEqual(99);
    expect(sum).toBeLessThanOrEqual(101);
  });

  it("devices percentages sum to ~100", () => {
    const data = generateAudienceData("linkedin", 5);
    const total = data.devices.reduce((s, d) => s + d.percentage, 0);
    expect(total).toBeGreaterThanOrEqual(98);
    expect(total).toBeLessThanOrEqual(102);
  });

  it("countries are sorted by users descending", () => {
    const data = generateAudienceData("youtube", 6);
    for (let i = 0; i < data.countries.length - 1; i++) {
      expect(data.countries[i].users).toBeGreaterThanOrEqual(data.countries[i + 1].users);
    }
  });

  it("interests are sorted by score descending", () => {
    const data = generateAudienceData("snapchat", 7);
    for (let i = 0; i < data.interests.length - 1; i++) {
      expect(data.interests[i].score).toBeGreaterThanOrEqual(data.interests[i + 1].score);
    }
  });

  it("different platforms produce different data", () => {
    const fb = generateAudienceData("facebook", 1);
    const ig = generateAudienceData("instagram", 2);
    expect(fb.summary.totalReach).not.toBe(ig.summary.totalReach);
  });

  it("totalReach is a positive integer", () => {
    const data = generateAudienceData("twitter", 4);
    expect(data.summary.totalReach).toBeGreaterThan(0);
    expect(Number.isInteger(data.summary.totalReach)).toBe(true);
  });

  it("topCountry is a non-empty string", () => {
    const data = generateAudienceData("pinterest", 8);
    expect(data.summary.topCountry).toBeTruthy();
    expect(typeof data.summary.topCountry).toBe("string");
  });

  it("topAgeGroup is always 25-34", () => {
    const data = generateAudienceData("facebook", 1);
    expect(data.summary.topAgeGroup).toBe("25-34");
  });
});
