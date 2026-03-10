import { useTranslation } from "react-i18next";
import { ToolCard } from "./ToolCard";
import { TOOLS } from "./toolsConfig";

export default function MarketingToolsPage() {
  const { t } = useTranslation();
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t("nav.marketingTools")}</h1>
        <p className="text-gray-500 mt-1 text-sm">{t("marketingTools.subtitle")}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TOOLS.map((tool) => (
          <ToolCard
            key={tool.href}
            icon={tool.icon}
            title={t(tool.titleKey)}
            description={t(tool.descKey)}
            href={tool.href}
            gradient={tool.gradient}
            iconColor={tool.iconColor}
            borderColor={tool.borderColor}
          />
        ))}
      </div>
    </div>
  );
}
