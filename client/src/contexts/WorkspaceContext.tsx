/**
 * WorkspaceContext.tsx
 * Global context for the currently active workspace.
 * Persists selection in localStorage and auto-selects the first workspace on load.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { trpc } from "@/lib/trpc";

// ─── Types ────────────────────────────────────────────────────────────────────
export type WorkspacePlan = "free" | "pro" | "agency" | "enterprise";
export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export interface WorkspaceItem {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  plan: WorkspacePlan;
  created_by: number;
  created_at: string;
  updated_at: string;
  role: WorkspaceRole;
}

interface WorkspaceContextValue {
  workspaces: WorkspaceItem[];
  activeWorkspace: WorkspaceItem | null;
  activeWorkspaceId: number | null;
  setActiveWorkspace: (id: number) => void;
  isLoading: boolean;
  refetch: () => void;
  /** Whether the current user can admin the active workspace */
  canAdmin: boolean;
  /** Whether the current user is the owner of the active workspace */
  isOwner: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaces: [],
  activeWorkspace: null,
  activeWorkspaceId: null,
  setActiveWorkspace: () => {},
  isLoading: false,
  refetch: () => {},
  canAdmin: false,
  isOwner: false,
});

const LS_KEY = "dashfields_active_workspace_id";

// ─── Provider ─────────────────────────────────────────────────────────────────
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading, refetch } = trpc.workspaces.list.useQuery(undefined, {
    staleTime: 60_000,
  });

  const workspaces = useMemo(() => (data ?? []) as WorkspaceItem[], [data]);

  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem(LS_KEY);
    return stored ? parseInt(stored, 10) : null;
  });

  // Auto-select first workspace if none is stored or stored one no longer exists
  useEffect(() => {
    if (workspaces.length === 0) return;
    const valid = workspaces.find((w) => w.id === activeWorkspaceId);
    if (!valid) {
      const first = workspaces[0];
      setActiveWorkspaceIdState(first.id);
      localStorage.setItem(LS_KEY, String(first.id));
    }
  }, [workspaces, activeWorkspaceId]);

  const setActiveWorkspace = useCallback((id: number) => {
    setActiveWorkspaceIdState(id);
    localStorage.setItem(LS_KEY, String(id));
  }, []);

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId]
  );

  const canAdmin = useMemo(
    () => activeWorkspace?.role === "owner" || activeWorkspace?.role === "admin",
    [activeWorkspace]
  );

  const isOwner = useMemo(
    () => activeWorkspace?.role === "owner",
    [activeWorkspace]
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaces,
      activeWorkspace,
      activeWorkspaceId,
      setActiveWorkspace,
      isLoading,
      refetch,
      canAdmin,
      isOwner,
    }),
    [workspaces, activeWorkspace, activeWorkspaceId, setActiveWorkspace, isLoading, refetch, canAdmin, isOwner]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useWorkspace() {
  return useContext(WorkspaceContext);
}
