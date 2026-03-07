/**
 * WorkspaceSettings.tsx — Thin orchestrator that renders 4 workspace tabs.
 * Each tab is defined in workspace-tabs/ for maintainability.
 */
import { useState } from "react";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { Building2, Users, Sparkles, Settings, Target, Plus } from "lucide-react";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import {
  GeneralTab,
  TeamTab,
  BrandProfileTab,
  FinancialsTab,
  type TabId,
} from "./workspace-tabs";

export default function WorkspaceSettings() {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const { activeWorkspace, workspaces, isLoading } = useWorkspace();

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "general", label: "General", icon: Settings },
    { id: "team", label: "Team", icon: Users },
    { id: "brand", label: "Brand Profile", icon: Sparkles },
    { id: "financials", label: "Financials & Goals", icon: Target },
  ];

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Workspace Settings</h1>
            <p className="text-sm text-muted-foreground">
              {activeWorkspace?.name ?? "No workspace selected"}
            </p>
          </div>
        </div>
      </div>

      {/* No workspace state */}
      {!isLoading && workspaces.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-base font-semibold mb-1">No Workspace Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first workspace to start managing your team and brand.
          </p>
          <CreateWorkspaceButton />
        </div>
      )}

      {/* Workspace content */}
      {activeWorkspace && (
        <>
          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-muted/30 p-1 rounded-xl w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "general" && <GeneralTab />}
          {activeTab === "team" && <TeamTab />}
          {activeTab === "brand" && <BrandProfileTab />}
          {activeTab === "financials" && <FinancialsTab />}
        </>
      )}
    </div>
  );
}

// ─── Create Workspace Button ──────────────────────────────────────────────────
function CreateWorkspaceButton() {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const { refetch } = useWorkspace();

  const createMutation = trpc.workspaces.create.useMutation({
    onSuccess: () => {
      toast.success("Workspace created!");
      setShow(false); setName(""); refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!show) {
    return (
      <button onClick={() => setShow(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 transition-opacity mx-auto"
      >
        <Plus className="w-4 h-4" /> Create Workspace
      </button>
    );
  }

  return (
    <div className="flex gap-2 max-w-sm mx-auto">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workspace name..." autoFocus
        className="flex-1 px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
      <button onClick={() => createMutation.mutate({ name })} disabled={!name.trim() || createMutation.isPending}
        className="px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {createMutation.isPending ? "..." : "Create"}
      </button>
      <button onClick={() => setShow(false)} className="px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors">
        Cancel
      </button>
    </div>
  );
}
