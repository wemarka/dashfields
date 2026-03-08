/**
 * ActiveAccountContext.tsx
 * Global context for the currently selected social account.
 * Persists selection in localStorage. All pages can read/set the active account.
 */
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { trpc } from "@/core/lib/trpc";
import { useSupabaseAuth } from "@/core/contexts/SupabaseAuthContext";

export type SocialAccount = {
  id: number;
  platform: string;
  name: string | null;
  username: string | null;
  account_type: string | null;
  is_active: boolean | null;
  profile_picture: string | null;
  platform_account_id: string | null;
};

type ActiveAccountContextType = {
  accounts: SocialAccount[];
  activeAccount: SocialAccount | null;
  activeAccountId: number | null;
  setActiveAccountId: (id: number | null) => void;
  /** IDs of all accounts in the active group (for linked FB+IG+Ad selection) */
  activeGroupIds: number[];
  setActiveGroupIds: (ids: number[]) => void;
  isLoading: boolean;
};

const ActiveAccountContext = createContext<ActiveAccountContextType>({
  accounts: [],
  activeAccount: null,
  activeAccountId: null,
  setActiveAccountId: () => {},
  activeGroupIds: [],
  setActiveGroupIds: () => {},
  isLoading: false,
});

export function ActiveAccountProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useSupabaseAuth();
  const [activeId, setActiveId] = useState<number | null>(() => {
    const saved = localStorage.getItem("dashfields-active-account");
    return saved ? parseInt(saved, 10) : null;
  });
  const [activeGroupIds, setActiveGroupIdsState] = useState<number[]>(() => {
    const saved = localStorage.getItem("dashfields-active-group");
    return saved ? JSON.parse(saved) : [];
  });

  const { data: rawAccounts = [], isLoading } = trpc.social.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const accounts = rawAccounts as SocialAccount[];

  // Auto-select first account if none selected
  useEffect(() => {
    if (accounts.length > 0 && activeId === null) {
      const firstId = accounts[0].id;
      setActiveId(firstId);
      localStorage.setItem("dashfields-active-account", String(firstId));
    }
  }, [accounts, activeId]);

  const setActiveAccountId = (id: number | null) => {
    setActiveId(id);
    if (id === null) {
      localStorage.removeItem("dashfields-active-account");
    } else {
      localStorage.setItem("dashfields-active-account", String(id));
    }
  };

  const setActiveGroupIds = (ids: number[]) => {
    setActiveGroupIdsState(ids);
    localStorage.setItem("dashfields-active-group", JSON.stringify(ids));
  };

  const activeAccount = accounts.find(a => a.id === activeId) ?? accounts[0] ?? null;

  return (
    <ActiveAccountContext.Provider value={{
      accounts,
      activeAccount,
      activeAccountId: activeAccount?.id ?? null,
      setActiveAccountId,
      activeGroupIds,
      setActiveGroupIds,
      isLoading,
    }}>
      {children}
    </ActiveAccountContext.Provider>
  );
}

export function useActiveAccount() {
  return useContext(ActiveAccountContext);
}
