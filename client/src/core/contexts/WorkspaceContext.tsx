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
import { trpc } from "@/core/lib/trpc";
import { useSupabaseAuth } from "@/core/contexts/SupabaseAuthContext";

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

export interface WorkspaceFinancials {
  currency: string;
  targetRoas: string;
  monthlyBudget: string | null;
  onboardingCompleted: boolean;
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
  /** Financial settings from onboarding (currency, targetRoas, monthlyBudget) */
  workspaceFinancials: WorkspaceFinancials | null;
  /** Refresh financial settings (call after updating them) */
  refetchFinancials: () => void;
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
  workspaceFinancials: null,
  refetchFinancials: () => {},
});

const LS_KEY = "dashfields_active_workspace_id";

// ─── Provider ─────────────────────────────────────────────────────────────────
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useSupabaseAuth();
  const { data, isLoading, refetch } = trpc.workspaces.list.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const workspaces = useMemo(() => (data ?? []) as WorkspaceItem[], [data]);

  // Auto-Onboarding: if user has no workspaces, create a default one and assign orphan accounts
  const ensureDefault = trpc.workspaces.ensureDefault.useMutation({
    onSuccess: (result) => {
      if (result.created) {
        console.log(`[Auto-Onboarding] Created default workspace ${result.workspaceId}, assigned ${result.orphansAssigned} orphan accounts`);
        refetch();
      }
    },
  });

  const [onboardingTriggered, setOnboardingTriggered] = useState(false);

  useEffect(() => {
    // Only trigger once when we know the list is loaded and empty
    if (!isLoading && data !== undefined && workspaces.length === 0 && !onboardingTriggered) {
      setOnboardingTriggered(true);
      ensureDefault.mutate();
    }
  }, [isLoading, data, workspaces.length, onboardingTriggered, ensureDefault]);

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

  // ─── Financials (currency + targetRoas + monthlyBudget) ─────────────────────
  const {
    data: financialsData,
    refetch: refetchFinancials,
  } = trpc.workspaces.getOnboardingStatus.useQuery(
    { workspaceId: activeWorkspaceId ?? 0 },
    {
      enabled: !!activeWorkspaceId,
      staleTime: 30_000,
    }
  );

  const workspaceFinancials = useMemo<WorkspaceFinancials | null>(() => {
    if (!financialsData) return null;
    return {
      currency: financialsData.currency ?? "USD",
      targetRoas: financialsData.targetRoas ?? "3.0",
      monthlyBudget: financialsData.monthlyBudget || null,
      onboardingCompleted: financialsData.onboardingCompleted,
    };
  }, [financialsData]);

  const utils = trpc.useUtils();
  const setActiveWorkspace = useCallback((id: number) => {
    setActiveWorkspaceIdState(id);
    localStorage.setItem(LS_KEY, String(id));
    // Invalidate all cached queries when switching workspace
    // This prevents data leakage between workspaces in the UI
    utils.invalidate();
  }, [utils]);

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
      workspaceFinancials,
      refetchFinancials,
    }),
    [workspaces, activeWorkspace, activeWorkspaceId, setActiveWorkspace, isLoading, refetch, canAdmin, isOwner, workspaceFinancials, refetchFinancials]
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
