// AssetsTab — Brand Kit + Content Templates (Media Library) combined
import { useState } from "react";
import BrandKit from "@/app/features/brand/BrandKit";
import ContentTemplates from "@/app/features/content/ContentTemplates";
import { Palette, LayoutTemplate } from "lucide-react";

type SubTab = "brand-kit" | "templates";

const SUB_TABS: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: "brand-kit",  label: "Brand Kit",  icon: Palette },
  { id: "templates",  label: "Templates",  icon: LayoutTemplate },
];

export default function AssetsTab() {
  const [sub, setSub] = useState<SubTab>("brand-kit");

  return (
    <div className="flex flex-col">
      {/* Sub-tab bar */}
      <div className="flex items-center gap-1 px-6 pt-3 pb-0 border-b border-border/30">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={[
              "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-all duration-200 relative",
              sub === t.id
                ? "text-brand border-b-2 border-brand -mb-px bg-brand/5"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/5",
            ].join(" ")}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1">
        {sub === "brand-kit" && <BrandKit />}
        {sub === "templates" && <ContentTemplates />}
      </div>
    </div>
  );
}
