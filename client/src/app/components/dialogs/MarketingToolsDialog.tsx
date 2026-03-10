// MarketingToolsDialog.tsx — Opens from sidebar, shows 4 marketing tool cards with live stats.
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/core/components/ui/dialog";
import { trpc } from "@/core/lib/trpc";
import { ToolCard } from "@/app/pages/marketing/ToolCard";
import { TOOLS } from "@/app/pages/marketing/toolsConfig";

interface Props {
  open: boolean;
  onClose: () => void;
}

function getStatForHref(
  href: string,
  stats: { activeCampaigns: number; scheduledPosts: number; totalReports: number } | undefined,
): { value: number | null; labelKey: string | null } {
  if (!stats) return { value: null, labelKey: null };
  const map: Record<string, { value: number; labelKey: string }> = {
    "/ads/campaigns":     { value: stats.activeCampaigns,  labelKey: "marketingTools.statActive" },
    "/content/planner":   { value: stats.scheduledPosts,   labelKey: "marketingTools.statScheduled" },
    "/analytics/reports": { value: stats.totalReports,     labelKey: "marketingTools.statReports" },
  };
  return map[href] ?? { value: null, labelKey: null };
}

export function MarketingToolsDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = trpc.marketingStats.getStats.useQuery(undefined, { enabled: open });

  function handleToolClick(href: string) {
    onClose();
    setLocation(href);
  }

  return (
      <Dialog open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent className="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{t("nav.marketingTools")}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5">{t("marketingTools.subtitle")}</p>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
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
                onNavigate={handleToolClick}
              />
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
