/**
 * ContentPlanView.tsx — Displays the AI-generated content calendar and budget allocation.
 */
import { Calendar, Clock, Hash, TrendingUp, DollarSign, Users, Zap } from "lucide-react";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/core/lib/utils";
import type { ContentPlanItem, BudgetAllocation, AudienceInsight } from "./types";
import { PLATFORM_ICONS } from "./types";

interface Props {
  items: ContentPlanItem[];
  budgetAllocation: BudgetAllocation;
  insights: Record<string, AudienceInsight>;
  currency: string;
  totalBudget: number;
  onProceed: () => void;
  /** Number of content items to reveal (for staggered animation). Defaults to all. */
  revealedCount?: number;
}

export function ContentPlanView({
  items,
  budgetAllocation,
  insights,
  currency,
  totalBudget,
  onProceed,
  revealedCount,
}: Props) {
  const visibleCount = revealedCount !== undefined ? revealedCount : items.length;
  // Group by platform
  const byPlatform = items.reduce<Record<string, ContentPlanItem[]>>((acc, item) => {
    if (!acc[item.platform]) acc[item.platform] = [];
    acc[item.platform].push(item);
    return acc;
  }, {});

  const platforms = Object.keys(budgetAllocation);

  return (
    <div className="space-y-5">
      {/* Budget Allocation */}
      <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-4 border border-red-100">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-[#f87171]" />
          <h3 className="font-semibold text-white text-sm">توزيع الميزانية</h3>
          <Badge className="bg-[#ef3735]/14 text-[#f87171] border-0 text-xs mr-auto">
            {totalBudget.toLocaleString()} {currency}
          </Badge>
        </div>
        <div className="space-y-2">
          {platforms.map(platform => {
            const amount = budgetAllocation[platform] ?? 0;
            const pct = totalBudget > 0 ? (amount / totalBudget) * 100 : 0;
            return (
              <div key={platform} className="flex items-center gap-3">
                <span className="text-base w-6 text-center">{PLATFORM_ICONS[platform] ?? "📱"}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-neutral-300 capitalize">{platform}</span>
                    <span className="text-xs text-neutral-400">{amount.toLocaleString()} {currency}</span>
                  </div>
                  <div className="h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-neutral-500 w-10 text-right">{Math.round(pct)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Audience Insights */}
      {Object.keys(insights).length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#f87171]" />
            تحليل الجمهور لكل منصة
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {platforms.map(platform => {
              const insight = insights[platform];
              if (!insight) return null;
              return (
                <div key={platform} className="bg-neutral-900 rounded-xl border border-neutral-800 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{PLATFORM_ICONS[platform] ?? "📱"}</span>
                    <span className="font-medium text-white text-sm capitalize">{platform}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-neutral-400">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span>{insight.ageRange}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-neutral-400">
                      <Zap className="w-3 h-3 text-[#fbbf24]" />
                      <span>{insight.estimatedReach?.toLocaleString()} وصول</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-neutral-400">
                      <Clock className="w-3 h-3 text-foreground" />
                      <span>{insight.bestTimes?.slice(0, 2).join(", ")}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-neutral-400">
                      <DollarSign className="w-3 h-3 text-[#f87171]" />
                      <span>CPM: {insight.cpm} {currency}</span>
                    </div>
                  </div>
                  {insight.recommendation && (
                    <p className="text-[11px] text-neutral-400 mt-2 bg-neutral-800/50 rounded-lg p-2">
                      💡 {insight.recommendation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content Calendar */}
      <div className="space-y-2">
        <h3 className="font-semibold text-white text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#f87171]" />
          خطة النشر ({items.length} منشور)
        </h3>

        {Object.entries(byPlatform).map(([platform, platformItems]) => {
          // Only show items up to visibleCount across all platforms (cumulative)
          const platformStartIdx = items.findIndex(i => i.platform === platform);
          const visiblePlatformItems = platformItems.filter((_, idx) => platformStartIdx + idx < visibleCount);
          if (visiblePlatformItems.length === 0) return null;
          return (
            <div key={platform} className="border border-neutral-800 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-neutral-800/50 border-b border-neutral-800">
                <span className="text-base">{PLATFORM_ICONS[platform] ?? "📱"}</span>
                <span className="font-medium text-neutral-300 text-sm capitalize">{platform}</span>
                <Badge variant="outline" className="text-xs mr-auto">{platformItems.length} منشور</Badge>
              </div>
              <div className="divide-y divide-neutral-800">
                {visiblePlatformItems.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      animation: "fadeInUp 0.35s ease both",
                      animationDelay: `${idx * 0.05}s`,
                    }}
                  >
                    <ContentPlanCard item={item} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Proceed button */}
      <Button
        onClick={onProceed}
        className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3 rounded-xl shadow-md shadow-red-200"
      >
        المتابعة إلى معاينة الحملة →
      </Button>
    </div>
  );
}

function ContentPlanCard({ item }: { item: ContentPlanItem }) {
  const date = new Date(item.postDate);
  const formattedDate = date.toLocaleDateString("ar-SA", { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="p-3 bg-neutral-900">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] text-neutral-400">
            <Calendar className="w-3 h-3" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-neutral-400">
            <Clock className="w-3 h-3" />
            <span>{item.postTime}</span>
          </div>
        </div>
        <Badge
          className={cn(
            "text-[10px] border-0",
            item.status === "draft" ? "bg-neutral-800 text-neutral-400" : "bg-muted text-foreground",
          )}
        >
          {item.status === "draft" ? "مسودة" : "جاهز"}
        </Badge>
      </div>

      <p className="text-sm text-neutral-300 leading-relaxed mb-2 line-clamp-3">{item.caption}</p>

      {item.hashtags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.hashtags.slice(0, 5).map((tag) => (
            <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
              <Hash className="w-2.5 h-2.5" />
              {tag.replace(/^#/, "")}
            </span>
          ))}
          {item.hashtags.length > 5 && (
            <span className="text-[10px] text-neutral-500">+{item.hashtags.length - 5}</span>
          )}
        </div>
      )}
    </div>
  );
}
