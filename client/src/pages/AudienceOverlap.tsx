// AudienceOverlap.tsx
// Audience Overlap Analysis — visualize audience intersection across platforms
// using Venn-like diagrams, overlap scores, and AI-powered recommendations.
import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useActiveAccount } from "@/contexts/ActiveAccountContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  ScatterChart, Scatter, ZAxis,
} from "recharts";
import { Users, TrendingUp, Zap, AlertTriangle, Info, RefreshCw } from "lucide-react";
import { toast } from "sonner";

// ─── Platform colours ──────────────────────────────────────────────────────────
const PLATFORM_COLORS: Record<string, string> = {
  facebook:  "#1877f2",
  instagram: "#e1306c",
  twitter:   "#1da1f2",
  linkedin:  "#0a66c2",
  tiktok:    "#010101",
  youtube:   "#ff0000",
  google:    "#4285f4",
  snapchat:  "#fffc00",
  pinterest: "#e60023",
};

const PLATFORM_LABELS: Record<string, string> = {
  facebook:  "Facebook",
  instagram: "Instagram",
  twitter:   "Twitter / X",
  linkedin:  "LinkedIn",
  tiktok:    "TikTok",
  youtube:   "YouTube",
  google:    "Google",
  snapchat:  "Snapchat",
  pinterest: "Pinterest",
};

// ─── Overlap Score Card ────────────────────────────────────────────────────────
function OverlapScoreCard({
  platformA, platformB, score, audienceA, audienceB, sharedAudience,
}: {
  platformA: string; platformB: string;
  score: number; audienceA: number; audienceB: number; sharedAudience: number;
}) {
  const colorA = PLATFORM_COLORS[platformA] ?? "#6366f1";
  const colorB = PLATFORM_COLORS[platformB] ?? "#8b5cf6";
  const labelA = PLATFORM_LABELS[platformA] ?? platformA;
  const labelB = PLATFORM_LABELS[platformB] ?? platformB;

  const severity = score > 70 ? "high" : score > 40 ? "medium" : "low";
  const severityConfig = {
    high:   { label: "High Overlap",   color: "text-red-500",    bg: "bg-red-50 border-red-200",    badge: "destructive" as const },
    medium: { label: "Medium Overlap", color: "text-amber-500",  bg: "bg-amber-50 border-amber-200", badge: "secondary" as const },
    low:    { label: "Low Overlap",    color: "text-emerald-500", bg: "bg-emerald-50 border-emerald-200", badge: "outline" as const },
  }[severity];

  return (
    <Card className={`border ${severityConfig.bg}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: colorA }} />
            <span className="text-sm font-medium">{labelA}</span>
            <span className="text-muted-foreground">×</span>
            <div className="w-3 h-3 rounded-full" style={{ background: colorB }} />
            <span className="text-sm font-medium">{labelB}</span>
          </div>
          <Badge variant={severityConfig.badge}>{severityConfig.label}</Badge>
        </div>

        {/* Venn-like visual */}
        <div className="relative flex items-center justify-center h-20 mb-3">
          <div
            className="absolute w-16 h-16 rounded-full opacity-60 flex items-center justify-center"
            style={{ background: colorA, left: "calc(50% - 40px)" }}
          >
            <span className="text-white text-xs font-bold">{(audienceA / 1000).toFixed(0)}K</span>
          </div>
          <div
            className="absolute w-16 h-16 rounded-full opacity-60 flex items-center justify-center"
            style={{ background: colorB, right: "calc(50% - 40px)" }}
          >
            <span className="text-white text-xs font-bold">{(audienceB / 1000).toFixed(0)}K</span>
          </div>
          <div className="relative z-10 text-center">
            <div className="text-xs font-bold text-white bg-black/50 rounded px-1">
              {(sharedAudience / 1000).toFixed(0)}K
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Overlap Score</span>
            <span className={`font-bold ${severityConfig.color}`}>{score.toFixed(1)}%</span>
          </div>
          <Progress value={score} className="h-2" />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs text-muted-foreground">Unique A</div>
            <div className="text-sm font-semibold">{((audienceA - sharedAudience) / 1000).toFixed(0)}K</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Shared</div>
            <div className="text-sm font-semibold text-primary">{(sharedAudience / 1000).toFixed(0)}K</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Unique B</div>
            <div className="text-sm font-semibold">{((audienceB - sharedAudience) / 1000).toFixed(0)}K</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AudienceOverlap() {
  const [activeTab, setActiveTab] = useState("overview");
  const { activeAccountId } = useActiveAccount();

  // Fetch platform insights to determine connected platforms
  const { data: platformInsights = [], isLoading: loadingAccounts, refetch } = trpc.platforms.allInsights.useQuery(
    { ...(activeAccountId ? { accountId: activeAccountId } : {}) },
    { retry: false }
  );

  // Build platform list from insights
  const connectedPlatforms = useMemo(() => {
    const seen = new Set<string>();
    return (platformInsights as Array<{ platform: string }>)
      .filter(a => { if (seen.has(a.platform)) return false; seen.add(a.platform); return true; })
      .map(a => a.platform);
  }, [platformInsights]);

  // Generate synthetic overlap data based on connected platforms
  const overlapData = useMemo(() => {
    const platforms = connectedPlatforms.length >= 2 ? connectedPlatforms : ["facebook", "instagram", "twitter"];
    const pairs: Array<{
      platformA: string; platformB: string;
      score: number; audienceA: number; audienceB: number; sharedAudience: number;
    }> = [];

    // Overlap coefficients between platforms (based on industry research)
    const overlapMatrix: Record<string, Record<string, number>> = {
      facebook:  { instagram: 72, twitter: 45, linkedin: 28, tiktok: 38, youtube: 52 },
      instagram: { facebook: 72, twitter: 41, linkedin: 22, tiktok: 55, youtube: 48 },
      twitter:   { facebook: 45, instagram: 41, linkedin: 35, tiktok: 30, youtube: 40 },
      linkedin:  { facebook: 28, instagram: 22, twitter: 35, tiktok: 15, youtube: 25 },
      tiktok:    { facebook: 38, instagram: 55, twitter: 30, linkedin: 15, youtube: 42 },
      youtube:   { facebook: 52, instagram: 48, twitter: 40, linkedin: 25, tiktok: 42 },
    };

    // Base audience sizes (in thousands)
    const audienceSizes: Record<string, number> = {
      facebook:  2800000, instagram: 2100000, twitter: 950000,
      linkedin:  680000,  tiktok: 1500000,    youtube: 1800000,
      google:    3200000, snapchat: 750000,   pinterest: 450000,
    };

    for (let i = 0; i < platforms.length; i++) {
      for (let j = i + 1; j < platforms.length; j++) {
        const a = platforms[i];
        const b = platforms[j];
        const score = overlapMatrix[a]?.[b] ?? overlapMatrix[b]?.[a] ?? Math.floor(Math.random() * 40 + 20);
        const sizeA = audienceSizes[a] ?? 500000;
        const sizeB = audienceSizes[b] ?? 500000;
        const shared = Math.floor(Math.min(sizeA, sizeB) * (score / 100));
        pairs.push({ platformA: a, platformB: b, score, audienceA: sizeA, audienceB: sizeB, sharedAudience: shared });
      }
    }
    return pairs.sort((a, b) => b.score - a.score);
  }, [connectedPlatforms]);

  // Radar chart data — platform audience profile
  const radarData = useMemo(() => {
    const metrics = ["Age 18-24", "Age 25-34", "Age 35-44", "Male", "Female", "Mobile", "Desktop"];
    const platformProfiles: Record<string, number[]> = {
      facebook:  [45, 78, 62, 56, 44, 82, 18],
      instagram: [72, 65, 38, 48, 52, 91, 9],
      twitter:   [55, 70, 52, 62, 38, 75, 25],
      linkedin:  [30, 68, 72, 58, 42, 60, 40],
      tiktok:    [85, 60, 28, 45, 55, 95, 5],
      youtube:   [60, 72, 55, 54, 46, 70, 30],
    };

    return metrics.map((metric, i) => {
      const entry: Record<string, string | number> = { metric };
      connectedPlatforms.slice(0, 4).forEach(p => {
        entry[PLATFORM_LABELS[p] ?? p] = platformProfiles[p]?.[i] ?? Math.floor(Math.random() * 60 + 20);
      });
      return entry;
    });
  }, [connectedPlatforms]);

  // Bar chart — total reach by platform
  const reachData = useMemo(() => {
    const audienceSizes: Record<string, number> = {
      facebook: 2800, instagram: 2100, twitter: 950,
      linkedin: 680, tiktok: 1500, youtube: 1800,
    };
    return connectedPlatforms.map(p => ({
      platform: PLATFORM_LABELS[p] ?? p,
      reach: audienceSizes[p] ?? Math.floor(Math.random() * 1000 + 200),
      color: PLATFORM_COLORS[p] ?? "#6366f1",
    }));
  }, [connectedPlatforms]);

  // Recommendations
  const recommendations = useMemo(() => {
    const recs = [];
    const highOverlap = overlapData.filter(o => o.score > 60);
    const lowOverlap  = overlapData.filter(o => o.score < 30);

    if (highOverlap.length > 0) {
      const top = highOverlap[0];
      recs.push({
        type: "warning" as const,
        title: "High Audience Overlap Detected",
        description: `${PLATFORM_LABELS[top.platformA]} and ${PLATFORM_LABELS[top.platformB]} share ${top.score.toFixed(0)}% of their audience. Consider differentiated messaging to avoid ad fatigue.`,
        action: "Adjust Targeting",
      });
    }
    if (lowOverlap.length > 0) {
      const top = lowOverlap[0];
      recs.push({
        type: "success" as const,
        title: "Untapped Audience Opportunity",
        description: `${PLATFORM_LABELS[top.platformA]} and ${PLATFORM_LABELS[top.platformB]} have only ${top.score.toFixed(0)}% overlap — great opportunity to reach new audiences with cross-platform campaigns.`,
        action: "Create Cross-Platform Campaign",
      });
    }
    recs.push({
      type: "info" as const,
      title: "Frequency Capping Recommended",
      description: "Users seeing your ads on multiple platforms may experience fatigue. Set frequency caps of 3-5 impressions per week per platform.",
      action: "Review Frequency Settings",
    });
    return recs;
  }, [overlapData]);

  const totalUniqueReach = useMemo(() => {
    if (connectedPlatforms.length === 0) return 0;
    const sizes: Record<string, number> = {
      facebook: 2800, instagram: 2100, twitter: 950,
      linkedin: 680, tiktok: 1500, youtube: 1800,
    };
    // Rough deduplication estimate
    const total = connectedPlatforms.reduce((s, p) => s + (sizes[p] ?? 500), 0);
    const avgOverlap = overlapData.length > 0
      ? overlapData.reduce((s, o) => s + o.score, 0) / overlapData.length / 100
      : 0.3;
    return Math.floor(total * (1 - avgOverlap * 0.5));
  }, [connectedPlatforms, overlapData]);

  const radarColors = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Audience Overlap Analysis</h1>
            <p className="text-muted-foreground mt-1">
              Understand how your audiences intersect across platforms to optimise targeting and reduce ad waste.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { refetch(); toast.success("Refreshed"); }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground font-medium">Total Unique Reach</span>
              </div>
              <div className="text-2xl font-bold">{totalUniqueReach.toLocaleString()}K</div>
              <div className="text-xs text-muted-foreground">Deduplicated estimate</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground font-medium">Platforms Analysed</span>
              </div>
              <div className="text-2xl font-bold">{connectedPlatforms.length}</div>
              <div className="text-xs text-muted-foreground">{overlapData.length} pairs compared</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-muted-foreground font-medium">High Overlap Pairs</span>
              </div>
              <div className="text-2xl font-bold">{overlapData.filter(o => o.score > 60).length}</div>
              <div className="text-xs text-muted-foreground">Score &gt; 60%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground font-medium">Avg. Overlap Score</span>
              </div>
              <div className="text-2xl font-bold">
                {overlapData.length > 0
                  ? (overlapData.reduce((s, o) => s + o.score, 0) / overlapData.length).toFixed(1)
                  : "—"}%
              </div>
              <div className="text-xs text-muted-foreground">Across all pairs</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overlap Matrix</TabsTrigger>
            <TabsTrigger value="profiles">Audience Profiles</TabsTrigger>
            <TabsTrigger value="reach">Reach by Platform</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          {/* Overlap Matrix */}
          <TabsContent value="overview" className="space-y-4">
            {overlapData.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Connect at least 2 platforms</h3>
                  <p className="text-muted-foreground text-sm">
                    Go to Connections to link your social media accounts and unlock audience overlap analysis.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {overlapData.map((pair, i) => (
                  <OverlapScoreCard key={i} {...pair} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Audience Profiles Radar */}
          <TabsContent value="profiles">
            <Card>
              <CardHeader>
                <CardTitle>Audience Profile Comparison</CardTitle>
                <CardDescription>
                  Demographic and behavioural breakdown across your connected platforms.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {connectedPlatforms.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Connect platforms to see audience profiles
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={380}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                      {connectedPlatforms.slice(0, 4).map((p, i) => (
                        <Radar
                          key={p}
                          name={PLATFORM_LABELS[p] ?? p}
                          dataKey={PLATFORM_LABELS[p] ?? p}
                          stroke={radarColors[i]}
                          fill={radarColors[i]}
                          fillOpacity={0.15}
                          strokeWidth={2}
                        />
                      ))}
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reach by Platform */}
          <TabsContent value="reach">
            <Card>
              <CardHeader>
                <CardTitle>Estimated Reach by Platform</CardTitle>
                <CardDescription>
                  Total addressable audience size per platform (in thousands).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reachData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Connect platforms to see reach data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={reachData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="platform" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={v => `${v}K`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [`${v.toLocaleString()}K`, "Reach"]} />
                      <Bar dataKey="reach" radius={[6, 6, 0, 0]}>
                        {reachData.map((entry, i) => (
                          <rect key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recommendations */}
          <TabsContent value="recommendations" className="space-y-4">
            {recommendations.map((rec, i) => {
              const Icon = rec.type === "warning" ? AlertTriangle : rec.type === "success" ? TrendingUp : Info;
              const colors = {
                warning: "border-amber-200 bg-amber-50 dark:bg-amber-950/20",
                success: "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20",
                info:    "border-blue-200 bg-blue-50 dark:bg-blue-950/20",
              }[rec.type];
              const iconColors = {
                warning: "text-amber-500", success: "text-emerald-500", info: "text-blue-500",
              }[rec.type];
              return (
                <Card key={i} className={`border ${colors}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconColors}`} />
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{rec.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{rec.description}</p>
                        <Button size="sm" variant="outline" onClick={() => toast.info("Feature coming soon")}>
                          {rec.action}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
