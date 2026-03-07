/**
 * WorkspaceSettings.tsx — Workspace & Team settings inside Light Settings Modal.
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
    { id: "general",    label: "General",           icon: Settings },
    { id: "team",       label: "Team",              icon: Users },
    { id: "brand",      label: "Brand Profile",     icon: Sparkles },
    { id: "financials", label: "Financials & Goals", icon: Target },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Modal header */}
      <div className="px-7 pt-6 pb-5" style={{ borderBottom: "1px solid #f0f0f0" }}>
        <h2 className="text-[17px] font-semibold text-gray-900">Workspace & Team</h2>
        <p className="text-[13px] mt-0.5 text-gray-400">
          {activeWorkspace?.name ?? "Manage your workspace settings and team members"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-7 py-5">
        {/* No workspace state */}
        {!isLoading && workspaces.length === 0 && (
          <div className="rounded-2xl p-8 text-center border border-gray-100 bg-gray-50">
            <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <h3 className="text-[14px] font-semibold mb-1 text-gray-700">No Workspace Yet</h3>
            <p className="text-[13px] mb-4 text-gray-400">
              Create your first workspace to start managing your team and brand.
            </p>
            <CreateWorkspaceButton />
          </div>
        )}

        {/* Workspace content */}
        {activeWorkspace && (
          <>
            {/* Sub-tabs */}
            <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit bg-gray-100">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                  style={{
                    backgroundColor: activeTab === tab.id ? "#ffffff" : "transparent",
                    color: activeTab === tab.id ? "#111827" : "#6b7280",
                    boxShadow: activeTab === tab.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === "general"    && <GeneralTab />}
            {activeTab === "team"       && <TeamTab />}
            {activeTab === "brand"      && <BrandProfileTab />}
            {activeTab === "financials" && <FinancialsTab />}
          </>
        )}
      </div>
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
      <button
        onClick={() => setShow(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium mx-auto transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#3b82f6", color: "#fff" }}
      >
        <Plus className="w-4 h-4" /> Create Workspace
      </button>
    );
  }

  return (
    <div className="flex gap-2 max-w-sm mx-auto">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Workspace name..."
        autoFocus
        className="flex-1 px-3 py-2 rounded-xl text-[13px] border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/40 bg-white text-gray-800"
      />
      <button
        onClick={() => createMutation.mutate({ name })}
        disabled={!name.trim() || createMutation.isPending}
        className="px-4 py-2 rounded-xl text-[13px] font-medium disabled:opacity-50 transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#3b82f6", color: "#fff" }}
      >
        {createMutation.isPending ? "..." : "Create"}
      </button>
      <button
        onClick={() => setShow(false)}
        className="px-3 py-2 rounded-xl text-[13px] text-gray-400 hover:text-gray-600 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
