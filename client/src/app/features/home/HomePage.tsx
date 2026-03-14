/**
 * HomePage — Creative hub landing page.
 * Inspired by Higgsfield-style layout: hero banner, creation tools, what's new, recent creations.
 */
import { useAuth } from "@/shared/hooks/useAuth";
import { useLocation } from "wouter";
import { trpc } from "@/core/lib/trpc";
import {
  Sparkles,
  Image as ImageIcon,
  Video,
  PenTool,
  BarChart3,
  Megaphone,
  Calendar,
  ArrowRight,
  Play,
  Zap,
  TrendingUp,
  Star,
  Clock,
} from "lucide-react";
import { useMemo } from "react";

// ─── Tool Card Data ──────────────────────────────────────────────────────────
const CREATE_TOOLS = [
  {
    id: "campaign",
    label: "Create Campaign",
    description: "Launch a new ad campaign across platforms",
    icon: Megaphone,
    path: "/campaign-wizard",
    gradient: "from-brand/20 to-red-900/20",
    iconColor: "text-brand",
  },
  {
    id: "image",
    label: "Generate Image",
    description: "AI-powered visuals for your brand",
    icon: ImageIcon,
    path: "/studios",
    gradient: "from-violet-500/20 to-purple-900/20",
    iconColor: "text-violet-400",
  },
  {
    id: "video",
    label: "Create Video",
    description: "Cinematic ads and social content",
    icon: Video,
    path: "/studios",
    gradient: "from-blue-500/20 to-cyan-900/20",
    iconColor: "text-blue-400",
  },
  {
    id: "content",
    label: "Write Content",
    description: "AI copywriting for posts and ads",
    icon: PenTool,
    path: "/assist",
    gradient: "from-emerald-500/20 to-green-900/20",
    iconColor: "text-emerald-400",
  },
  {
    id: "schedule",
    label: "Schedule Post",
    description: "Plan and publish across channels",
    icon: Calendar,
    path: "/content/planner",
    gradient: "from-amber-500/20 to-orange-900/20",
    iconColor: "text-amber-400",
  },
  {
    id: "analytics",
    label: "View Analytics",
    description: "Track performance and ROI",
    icon: BarChart3,
    path: "/analytics/overview",
    gradient: "from-cyan-500/20 to-teal-900/20",
    iconColor: "text-cyan-400",
  },
];

const WHATS_NEW = [
  {
    id: "1",
    badge: "NEW",
    title: "AI Video Generation",
    description: "Create cinematic video ads with Dash Studios using AI-powered generation.",
    icon: Video,
    badgeColor: "bg-brand text-white",
  },
  {
    id: "2",
    badge: "IMPROVED",
    title: "Smart Campaign Builder",
    description: "Our campaign wizard now suggests optimal budgets and targeting automatically.",
    icon: Zap,
    badgeColor: "bg-emerald-500/20 text-emerald-400",
  },
  {
    id: "3",
    badge: "NEW",
    title: "Multi-Platform Analytics",
    description: "Compare performance across Facebook, Instagram, TikTok, and LinkedIn in one view.",
    icon: TrendingUp,
    badgeColor: "bg-blue-500/20 text-blue-400",
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// ─── Tool Card Component ─────────────────────────────────────────────────────
function ToolCard({
  tool,
  onClick,
}: {
  tool: (typeof CREATE_TOOLS)[number];
  onClick: () => void;
}) {
  const Icon = tool.icon;
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-start p-5 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 hover:bg-neutral-800/50 transition-all duration-300 text-left cursor-pointer"
    >
      <div
        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}
      >
        <Icon className={`w-5 h-5 ${tool.iconColor}`} />
      </div>
      <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-brand transition-colors">
        {tool.label}
      </h3>
      <p className="text-xs text-neutral-500 leading-relaxed">{tool.description}</p>
      <ArrowRight className="absolute top-5 right-5 w-4 h-4 text-neutral-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300" />
    </button>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  const { data: creations, isLoading: creationsLoading } =
    trpc.homeStats.recentCreations.useQuery(undefined, {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    });

  const hasCreations = creations && creations.length > 0;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
      {/* ── Hero Section ──────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden mb-8 border border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glow accent */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-brand/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-violet-500/5 rounded-full blur-3xl" />

        <div className="relative px-6 sm:px-10 py-10 sm:py-14">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-brand" />
            </div>
            <span className="text-xs font-medium text-brand uppercase tracking-wider">
              Creative Hub
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-base text-neutral-400 max-w-lg">
            What would you like to create today? Jump into campaigns, generate visuals, or let AI
            handle the heavy lifting.
          </p>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setLocation("/assist")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand hover:bg-brand/90 text-white text-sm font-medium transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Ask AI Assist
            </button>
            <button
              onClick={() => setLocation("/studios")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-neutral-700 bg-neutral-800/50 hover:bg-neutral-800 text-neutral-300 text-sm font-medium transition-colors"
            >
              <Play className="w-4 h-4" />
              Open Studios
            </button>
          </div>
        </div>
      </div>

      {/* ── What Would You Create Today? ──────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white">
              What would you create today?
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Quick-launch your favorite tools
            </p>
          </div>
          <button
            onClick={() => setLocation("/studios")}
            className="text-xs text-neutral-400 hover:text-brand flex items-center gap-1 transition-colors"
          >
            Explore all tools
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CREATE_TOOLS.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onClick={() => setLocation(tool.path)}
            />
          ))}
        </div>
      </section>

      {/* ── Bottom Grid: What's New + Recent Creations ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* What's New — 7/12 */}
        <section className="lg:col-span-7">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">What's New</h2>
            </div>
          </div>
          <div className="space-y-3">
            {WHATS_NEW.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-4 p-4 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-neutral-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                      <h3 className="text-sm font-medium text-white">{item.title}</h3>
                    </div>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent Creations — 5/12 */}
        <section className="lg:col-span-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-neutral-400" />
              <h2 className="text-sm font-semibold text-white">Recent Creations</h2>
            </div>
            {hasCreations && (
              <button
                onClick={() => setLocation("/assets")}
                className="text-xs text-neutral-400 hover:text-brand flex items-center gap-1 transition-colors"
              >
                View all
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {creationsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="aspect-[4/3] rounded-xl bg-neutral-800 border border-neutral-700 animate-pulse"
                />
              ))}
            </div>
          ) : hasCreations ? (
            <div className="grid grid-cols-2 gap-3">
              {creations.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer"
                >
                  {item.url ? (
                    <img
                      src={item.url}
                      alt={item.label}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-neutral-800/50" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        {item.type === "video" ? (
                          <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center group-hover:bg-neutral-600 transition-colors">
                            <Play className="w-4 h-4 text-neutral-300 ml-0.5" />
                          </div>
                        ) : (
                          <ImageIcon className="w-6 h-6 text-neutral-600" />
                        )}
                      </div>
                    </>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/70 to-transparent">
                    <span className="text-[11px] text-white/90 font-medium line-clamp-1">
                      {item.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-neutral-800 bg-neutral-900/50">
              <div className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-brand" />
              </div>
              <p className="text-sm text-neutral-400 mb-1 font-medium">No creations yet</p>
              <p className="text-xs text-neutral-500 max-w-[200px]">
                Use AI Assist or Dash Studios to generate your first campaign visuals
              </p>
              <button
                onClick={() => setLocation("/studios")}
                className="mt-4 text-xs text-brand hover:text-brand/80 flex items-center gap-1 transition-colors"
              >
                Start creating
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
