import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
// Simulated audience data for non-Meta platforms
function generateAudienceData(platform: string, seed: number) {
  const rng = (n: number) => Math.abs(Math.sin(seed * n) * 100);

  const ageGroups = [
    { group: "13-17", male: Math.round(rng(1) * 0.3), female: Math.round(rng(2) * 0.3) },
    { group: "18-24", male: Math.round(rng(3) * 1.2), female: Math.round(rng(4) * 1.1) },
    { group: "25-34", male: Math.round(rng(5) * 1.5), female: Math.round(rng(6) * 1.4) },
    { group: "35-44", male: Math.round(rng(7) * 1.0), female: Math.round(rng(8) * 0.9) },
    { group: "45-54", male: Math.round(rng(9) * 0.7), female: Math.round(rng(10) * 0.6) },
    { group: "55-64", male: Math.round(rng(11) * 0.4), female: Math.round(rng(12) * 0.35) },
    { group: "65+", male: Math.round(rng(13) * 0.2), female: Math.round(rng(14) * 0.18) },
  ];

  const countries = [
    { country: "Saudi Arabia", code: "SA", users: Math.round(rng(15) * 5) },
    { country: "UAE", code: "AE", users: Math.round(rng(16) * 4) },
    { country: "Egypt", code: "EG", users: Math.round(rng(17) * 3.5) },
    { country: "Kuwait", code: "KW", users: Math.round(rng(18) * 2.5) },
    { country: "Qatar", code: "QA", users: Math.round(rng(19) * 2) },
    { country: "Jordan", code: "JO", users: Math.round(rng(20) * 1.8) },
    { country: "Bahrain", code: "BH", users: Math.round(rng(21) * 1.5) },
    { country: "Oman", code: "OM", users: Math.round(rng(22) * 1.2) },
  ].sort((a, b) => b.users - a.users);

  const interests = [
    { category: "Technology", score: Math.round(rng(23) * 0.9) },
    { category: "Business", score: Math.round(rng(24) * 0.85) },
    { category: "Shopping", score: Math.round(rng(25) * 0.8) },
    { category: "Entertainment", score: Math.round(rng(26) * 0.75) },
    { category: "Sports", score: Math.round(rng(27) * 0.7) },
    { category: "Travel", score: Math.round(rng(28) * 0.65) },
    { category: "Food & Dining", score: Math.round(rng(29) * 0.6) },
    { category: "Health & Fitness", score: Math.round(rng(30) * 0.55) },
    { category: "Fashion", score: Math.round(rng(31) * 0.5) },
    { category: "Education", score: Math.round(rng(32) * 0.45) },
  ].sort((a, b) => b.score - a.score);

  const devices = [
    { device: "Mobile", percentage: Math.round(55 + rng(33) * 0.2) },
    { device: "Desktop", percentage: Math.round(25 + rng(34) * 0.15) },
    { device: "Tablet", percentage: Math.round(10 + rng(35) * 0.1) },
    { device: "Other", percentage: Math.round(2 + rng(36) * 0.05) },
  ];

  // Normalize devices to 100%
  const total = devices.reduce((s, d) => s + d.percentage, 0);
  devices.forEach((d) => (d.percentage = Math.round((d.percentage / total) * 100)));

  const totalMale = ageGroups.reduce((s, g) => s + g.male, 0);
  const totalFemale = ageGroups.reduce((s, g) => s + g.female, 0);
  const totalAll = totalMale + totalFemale;

  return {
    platform,
    summary: {
      totalReach: Math.round(rng(37) * 50000),
      malePercent: Math.round((totalMale / totalAll) * 100),
      femalePercent: Math.round((totalFemale / totalAll) * 100),
      topCountry: countries[0]?.country ?? "N/A",
      topAgeGroup: "25-34",
    },
    ageGender: ageGroups,
    countries,
    interests,
    devices,
  };
}

const PLATFORM_SEEDS: Record<string, number> = {
  facebook: 1,
  instagram: 2,
  tiktok: 3,
  twitter: 4,
  linkedin: 5,
  youtube: 6,
  snapchat: 7,
  pinterest: 8,
};

export const audienceRouter = router({
  getAudienceData: protectedProcedure
    .input(
      z.object({
        platform: z.string().default("all"),
        datePreset: z.string().default("last_30d"),
      })
    )
    .query(async ({ input }) => {
      const { platform } = input;

      if (platform === "all") {
        // Aggregate across all platforms
        const allData = Object.entries(PLATFORM_SEEDS).map(([p, seed]) =>
          generateAudienceData(p, seed)
        );

        // Merge age/gender
        const ageGroups = allData[0].ageGender.map((g, i) => ({
          group: g.group,
          male: allData.reduce((s, d) => s + d.ageGender[i].male, 0),
          female: allData.reduce((s, d) => s + d.ageGender[i].female, 0),
        }));

        // Merge countries
        const countryMap = new Map<string, { country: string; code: string; users: number }>();
        allData.forEach((d) => {
          d.countries.forEach((c) => {
            const existing = countryMap.get(c.country);
            if (existing) {
              existing.users += c.users;
            } else {
              countryMap.set(c.country, { ...c });
            }
          });
        });
        const countries = Array.from(countryMap.values()).sort((a, b) => b.users - a.users);

        // Merge interests
        const interestMap = new Map<string, { category: string; score: number }>();
        allData.forEach((d) => {
          d.interests.forEach((i) => {
            const existing = interestMap.get(i.category);
            if (existing) {
              existing.score = Math.round((existing.score + i.score) / 2);
            } else {
              interestMap.set(i.category, { ...i });
            }
          });
        });
        const interests = Array.from(interestMap.values()).sort((a, b) => b.score - a.score);

        // Merge devices
        const deviceMap = new Map<string, { device: string; percentage: number }>();
        allData.forEach((d) => {
          d.devices.forEach((dev) => {
            const existing = deviceMap.get(dev.device);
            if (existing) {
              existing.percentage = Math.round((existing.percentage + dev.percentage) / 2);
            } else {
              deviceMap.set(dev.device, { ...dev });
            }
          });
        });
        const devices = Array.from(deviceMap.values());

        const totalMale = ageGroups.reduce((s, g) => s + g.male, 0);
        const totalFemale = ageGroups.reduce((s, g) => s + g.female, 0);
        const totalAll = totalMale + totalFemale;

        return {
          platform: "all",
          summary: {
            totalReach: allData.reduce((s, d) => s + d.summary.totalReach, 0),
            malePercent: Math.round((totalMale / totalAll) * 100),
            femalePercent: Math.round((totalFemale / totalAll) * 100),
            topCountry: countries[0]?.country ?? "N/A",
            topAgeGroup: "25-34",
          },
          ageGender: ageGroups,
          countries: countries.slice(0, 8),
          interests: interests.slice(0, 10),
          devices,
        };
      }

      const seed = PLATFORM_SEEDS[platform] ?? 1;
      return generateAudienceData(platform, seed);
    }),

  getPlatformComparison: protectedProcedure
    .input(z.object({ metric: z.enum(["reach", "male", "female"]).default("reach") }))
    .query(async () => {
      return Object.entries(PLATFORM_SEEDS).map(([platform, seed]) => {
        const data = generateAudienceData(platform, seed);
        return {
          platform,
          totalReach: data.summary.totalReach,
          malePercent: data.summary.malePercent,
          femalePercent: data.summary.femalePercent,
          topAgeGroup: data.summary.topAgeGroup,
        };
      });
    }),
});
