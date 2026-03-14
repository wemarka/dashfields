import { Megaphone, PenSquare, BarChart3, FileBarChart } from "lucide-react";

export const TOOLS = [
  {
    icon: Megaphone,
    titleKey: "nav.campaigns",
    descKey: "marketingTools.campaignsDesc",
    href: "/ads/campaigns",
    gradient: "from-brand/10 to-brand/5",
    iconColor: "text-brand",
    borderColor: "border-brand/20 hover:border-brand/40",
  },
  {
    icon: PenSquare,
    titleKey: "nav.content",
    descKey: "marketingTools.contentDesc",
    href: "/content/planner",
    gradient: "from-muted/50 to-muted/30",
    iconColor: "text-foreground",
    borderColor: "border-border hover:border-muted-foreground/30",
  },
  {
    icon: BarChart3,
    titleKey: "nav.analytics",
    descKey: "marketingTools.analyticsDesc",
    href: "/analytics/overview",
    gradient: "from-muted/50 to-muted/30",
    iconColor: "text-muted-foreground",
    borderColor: "border-border hover:border-muted-foreground/30",
  },
  {
    icon: FileBarChart,
    titleKey: "nav.reports",
    descKey: "marketingTools.reportsDesc",
    href: "/analytics/reports",
    gradient: "from-muted/40 to-muted/20",
    iconColor: "text-muted-foreground",
    borderColor: "border-border hover:border-muted-foreground/30",
  },
] as const;
