// WorkspaceTeamTab — Workspace Settings + Team Management
import { useState } from "react";
import WorkspaceSettings from "@/app/features/settings/WorkspaceSettings";
import TeamPage from "@/app/features/team/TeamPage";
import { Building2, Users } from "lucide-react";

type SubTab = "workspace" | "team";

const SUB_TABS: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: "workspace", label: "Workspace", icon: Building2 },
  { id: "team",      label: "Team",      icon: Users },
];

export default function WorkspaceTeamTab() {
  const [sub, setSub] = useState<SubTab>("workspace");
  return (
    <div className="flex flex-col">
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
        {sub === "workspace" && <WorkspaceSettings />}
        {sub === "team"      && <TeamPage />}
      </div>
    </div>
  );
}
