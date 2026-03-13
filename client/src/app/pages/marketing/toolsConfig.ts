import { Megaphone, PenSquare, BarChart3, FileBarChart } from "lucide-react";

export const TOOLS = [
  {
    icon: Megaphone,
    titleKey: "nav.campaigns",
    descKey: "marketingTools.campaignsDesc",
    href: "/ads/campaigns",
    gradient: "from-brand/10 to-brand/5",
    iconColor: "text-brand",
    borderColor: "border-brand/20/60 hover:border-brand/40",
  },
  {
    icon: PenSquare,
    titleKey: "nav.content",
    descKey: "marketingTools.contentDesc",
    href: "/content/planner",
    gradient: "from-brand/10 to-brand/5",
    iconColor: "text-blue-600",
    borderColor: "border-blue-200/60 hover:border-blue-300",
  },
  {
    icon: BarChart3,
    titleKey: "nav.analytics",
    descKey: "marketingTools.analyticsDesc",
    href: "/analytics/overview",
    gradient: "from-emerald-50 to-teal-50",
    iconColor: "text-emerald-600",
    borderColor: "border-emerald-200/60 hover:border-emerald-300",
  },
  {
    icon: FileBarChart,
    titleKey: "nav.reports",
    descKey: "marketingTools.reportsDesc",
    href: "/analytics/reports",
    gradient: "from-orange-50 to-amber-50",
    iconColor: "text-orange-600",
    borderColor: "border-orange-200/60 hover:border-orange-300",
  },
] as const;
