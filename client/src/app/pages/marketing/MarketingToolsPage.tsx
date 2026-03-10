// MarketingToolsPage.tsx — Hub page with 4 tool cards + live stats.
import { useTranslation } from "react-i18next";
import { trpc } from "@/core/lib/trpc";
import { ToolCard } from "./ToolCard";
import { TOOLS } from "./toolsConfig";

// Resolve stat value + label key for a given tool href
function getStatForHref(
  href: string,
  stats: { activeCampaigns: number; scheduledPosts: number; totalReports: number } | undefined,
): { value: number | null; labelKey: string | null } {
  if (!stats) return { value: null, labelKey: null };
  const map: Record<string, { value: number; labelKey: string }> = {
    "/ads/campaigns":     { value: stats.activeCampaigns, labelKey: "marketingTools.statActive" },
    "/content/planner":   { value: stats.scheduledPosts,  labelKey: "marketingTools.statScheduled" },
    "/analytics/reports": { value: stats.totalReports,    labelKey: "marketingTools.statReports" },
  };
  return map[href] ?? { value: null, labelKey: null };
}

export default function MarketingToolsPage() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = trpc.marketingStats.getStats.useQuery();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t("nav.marketingTools")}</h1>
        <p className="text-gray-500 mt-1 text-sm">{t("marketingTools.subtitle")}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TOOLS.map((tool) => {
          const { value, labelKey } = getStatForHref(tool.href, stats);
          return (
            <ToolCard
              key={tool.href}
              icon={tool.icon}
              title={t(tool.titleKey)}
              description={t(tool.descKey)}
              href={tool.href}
              gradient={tool.gradient}
              iconColor={tool.iconColor}
              borderColor={tool.borderColor}
              statValue={value}
              statLabel={labelKey ? t(labelKey) : undefined}
              isLoading={isLoading}
            />
          );
        })}
      </div>
    </div>
  );
}
