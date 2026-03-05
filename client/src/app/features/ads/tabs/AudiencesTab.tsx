// AudiencesTab — Audience + SavedAudiences content embedded in Ads hub
import { useState } from "react";
import Audience from "@/app/features/audience/Audience";
import SavedAudiences from "@/app/features/audience/SavedAudiences";
import AudienceOverlap from "@/app/features/audience/AudienceOverlap";
import { useTranslation } from "react-i18next";
import { Users, BookmarkCheck, GitMerge } from "lucide-react";

type SubTab = "demographics" | "saved" | "overlap";

const SUB_TABS: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: "demographics", label: "Demographics", icon: Users },
  { id: "saved",        label: "Saved Audiences", icon: BookmarkCheck },
  { id: "overlap",      label: "Audience Overlap", icon: GitMerge },
];

export default function AudiencesTab() {
  const [sub, setSub] = useState<SubTab>("demographics");

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
      {/* Content — each component renders its own <div className="p-6"> */}
      <div className="flex-1">
        {sub === "demographics" && <AudienceInner />}
        {sub === "saved"        && <SavedAudiences />}
        {sub === "overlap"      && <AudienceOverlapInner />}
      </div>
    </div>
  );
}

// Audience wraps itself in DashboardLayout — we need to render it standalone.
// Since we can't easily strip the layout, we render the full page and rely on
// the tab container's overflow to clip the outer DashboardLayout shell.
// The simplest approach: re-export the inner content directly.
function AudienceInner() {
  return <Audience />;
}

function AudienceOverlapInner() {
  return <AudienceOverlap />;
}
