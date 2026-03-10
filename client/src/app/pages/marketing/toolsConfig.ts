import { Megaphone, PenSquare, BarChart3, FileBarChart } from "lucide-react";

export const TOOLS = [
  {
    icon: Megaphone,
    titleKey: "nav.campaigns",
    descKey: "marketingTools.campaignsDesc",
    href: "/ads/campaigns",
    gradient: "from-violet-50 to-purple-50",
    iconColor: "text-violet-600",
    borderColor: "border-violet-200/60 hover:border-violet-300",
  },
  {
    icon: PenSquare,
    titleKey: "nav.content",
    descKey: "marketingTools.contentDesc",
    href: "/content/planner",
    gradient: "from-blue-50 to-indigo-50",
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
