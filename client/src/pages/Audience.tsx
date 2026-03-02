/**
 * Audience Analytics Page
 * Demographics: age/gender, location, interests, devices
 */
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import { Users, MapPin, Heart, Smartphone, TrendingUp, Globe2 } from "lucide-react";
import { PLATFORMS } from "@shared/platforms";

const PLATFORM_OPTIONS = [
  { value: "all", label: "All Platforms" },
  ...PLATFORMS.map((p) => ({ value: p.id, label: p.name })),
];

const DATE_PRESETS = [
  { value: "last_7d", label: "Last 7 days" },
  { value: "last_30d", label: "Last 30 days" },
  { value: "last_90d", label: "Last 90 days" },
];

const DEVICE_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd"];
const GENDER_COLORS = { male: "#6366f1", female: "#ec4899" };

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <Card className="glass">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AgeGenderChart({ data }: { data: Array<{ group: string; male: number; female: number }> }) {
  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-500" />
          Age & Gender Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="group" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
            />
            <Legend />
            <Bar dataKey="male" name="Male" fill={GENDER_COLORS.male} radius={[4, 4, 0, 0]} />
            <Bar dataKey="female" name="Female" fill={GENDER_COLORS.female} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function LocationChart({ data }: { data: Array<{ country: string; code: string; users: number }> }) {
  const max = Math.max(...data.map((d) => d.users), 1);
  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-500" />
          Top Countries
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.slice(0, 8).map((item, i) => (
            <div key={item.country} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium truncate">{item.country}</span>
                  <span className="text-xs text-muted-foreground ml-2">{item.users.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${(item.users / max) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function InterestsChart({ data }: { data: Array<{ category: string; score: number }> }) {
  const max = Math.max(...data.map((d) => d.score), 1);
  const colors = [
    "bg-indigo-500", "bg-purple-500", "bg-pink-500", "bg-orange-500",
    "bg-cyan-500", "bg-teal-500", "bg-yellow-500", "bg-red-500",
    "bg-blue-500", "bg-green-500",
  ];
  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Heart className="w-4 h-4 text-pink-500" />
          Top Interests
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.slice(0, 10).map((item, i) => (
            <div key={item.category} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium truncate">{item.category}</span>
                  <span className="text-xs text-muted-foreground">{item.score}%</span>
                </div>
                <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colors[i % colors.length]} rounded-full transition-all duration-500`}
                    style={{ width: `${(item.score / max) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DeviceChart({ data }: { data: Array<{ device: string; percentage: number }> }) {
  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-violet-500" />
          Device Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="50%" height={160}>
            <PieChart>
              <Pie
                data={data}
                dataKey="percentage"
                nameKey="device"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={3}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => `${v}%`}
                contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-2">
            {data.map((item, i) => (
              <div key={item.device} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: DEVICE_COLORS[i % DEVICE_COLORS.length] }}
                  />
                  <span className="text-xs">{item.device}</span>
                </div>
                <span className="text-xs font-semibold">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PlatformComparisonCard({
  data,
}: {
  data: Array<{ platform: string; totalReach: number; malePercent: number; femalePercent: number }>;
}) {
  const max = Math.max(...data.map((d) => d.totalReach), 1);
  return (
    <Card className="glass col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-blue-500" />
          Platform Reach Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis
              dataKey="platform"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1, 4)}
            />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(v: number) => v.toLocaleString()}
              contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
            />
            <Bar dataKey="totalReach" name="Total Reach" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default function Audience() {
  const [platform, setPlatform] = useState("all");
  const [datePreset, setDatePreset] = useState("last_30d");

  const { data, isLoading } = trpc.audience.getAudienceData.useQuery({ platform, datePreset });
  const { data: comparison } = trpc.audience.getPlatformComparison.useQuery({ metric: "reach" });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="page-header">Audience</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Demographics, interests, and behavior across platforms
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Platform filter */}
            <div className="flex items-center gap-1 p-1 glass rounded-xl">
              {PLATFORM_OPTIONS.slice(0, 5).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPlatform(opt.value)}
                  className={[
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    platform === opt.value
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {/* Date preset */}
            <div className="flex items-center gap-1 p-1 glass rounded-xl">
              {DATE_PRESETS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDatePreset(opt.value)}
                  className={[
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    datePreset === opt.value
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="glass animate-pulse">
                <CardContent className="p-5 h-24" />
              </Card>
            ))}
          </div>
        ) : data ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                icon={Users}
                label="Total Reach"
                value={data.summary.totalReach.toLocaleString()}
                sub="Unique users reached"
                color="bg-indigo-500"
              />
              <KpiCard
                icon={TrendingUp}
                label="Male Audience"
                value={`${data.summary.malePercent}%`}
                sub="of total audience"
                color="bg-blue-500"
              />
              <KpiCard
                icon={Heart}
                label="Female Audience"
                value={`${data.summary.femalePercent}%`}
                sub="of total audience"
                color="bg-pink-500"
              />
              <KpiCard
                icon={MapPin}
                label="Top Country"
                value={data.summary.topCountry}
                sub={`Peak age: ${data.summary.topAgeGroup}`}
                color="bg-emerald-500"
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <AgeGenderChart data={data.ageGender} />
              <LocationChart data={data.countries} />
              <InterestsChart data={data.interests} />
              <DeviceChart data={data.devices} />
            </div>

            {/* Platform Comparison */}
            {comparison && (
              <div className="grid grid-cols-2 gap-4">
                <PlatformComparisonCard data={comparison} />
                <Card className="glass">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Gender Split by Platform</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {comparison.map((p) => (
                        <div key={p.platform} className="flex items-center gap-3">
                          <span className="text-xs w-20 capitalize text-muted-foreground truncate">
                            {p.platform}
                          </span>
                          <div className="flex-1 h-3 rounded-full overflow-hidden bg-muted/30 flex">
                            <div
                              className="h-full bg-indigo-500 transition-all duration-500"
                              style={{ width: `${p.malePercent}%` }}
                            />
                            <div
                              className="h-full bg-pink-400 transition-all duration-500"
                              style={{ width: `${p.femalePercent}%` }}
                            />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground w-24">
                            <span className="text-indigo-500">{p.malePercent}%</span>
                            <span>/</span>
                            <span className="text-pink-400">{p.femalePercent}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/10">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                        <span className="text-xs text-muted-foreground">Male</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-pink-400" />
                        <span className="text-xs text-muted-foreground">Female</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No audience data available</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Connect platforms to see demographics</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
