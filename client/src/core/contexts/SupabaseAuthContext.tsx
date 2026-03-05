/**
 * client/src/core/contexts/SupabaseAuthContext.tsx
 * Supabase Auth context — provides session, user, sign-in/sign-up/sign-out.
 * This replaces Manus OAuth as the primary auth system.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session, User as SupabaseUser, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/core/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface SupabaseAuthState {
  status: AuthStatus;
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface SupabaseAuthActions {
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  refreshSession: () => Promise<void>;
}

export type SupabaseAuthContextValue = SupabaseAuthState & SupabaseAuthActions;

// ─── Context ──────────────────────────────────────────────────────────────────

const SupabaseAuthContext = createContext<SupabaseAuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const queryClient = useQueryClient();

  // Initialize session from storage
  useEffect(() => {
    if (!supabase) {
      setStatus("unauthenticated");
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSupabaseUser(data.session?.user ?? null);
      setStatus(data.session ? "authenticated" : "unauthenticated");
    });

    // Listen for auth state changes — invalidate all tRPC queries so they
    // re-fetch with the new (or cleared) Bearer token.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setSupabaseUser(newSession?.user ?? null);
        setStatus(newSession ? "authenticated" : "unauthenticated");
        // Force tRPC to re-fetch all queries with the updated token
        queryClient.invalidateQueries();
      }
    );

    return () => subscription.unsubscribe();
  }, [queryClient]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: { message: "Supabase not configured", name: "AuthError", status: 500 } as AuthError };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, name?: string) => {
    if (!supabase) return { error: { message: "Supabase not configured", name: "AuthError", status: 500 } as AuthError };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name ?? email.split("@")[0] },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  }, []);

   const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setSupabaseUser(null);
    setStatus("unauthenticated");
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) return { error: { message: "Supabase not configured", name: "AuthError", status: 500 } as AuthError };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    return { error };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (!supabase) return { error: { message: "Supabase not configured", name: "AuthError", status: 500 } as AuthError };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  }, []);

  const refreshSession = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.refreshSession();
    setSession(data.session);
    setSupabaseUser(data.session?.user ?? null);
    setStatus(data.session ? "authenticated" : "unauthenticated");
  }, []);

  // ─── Context value ───────────────────────────────────────────────────────────

  const value: SupabaseAuthContextValue = {
    status,
    session,
    supabaseUser,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    signInWithEmail,
    signUpWithEmail,
    signOut,
    resetPassword,
    updatePassword,
    refreshSession,
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSupabaseAuth(): SupabaseAuthContextValue {
  const ctx = useContext(SupabaseAuthContext);
  if (!ctx) {
    throw new Error("useSupabaseAuth must be used within SupabaseAuthProvider");
  }
  return ctx;
}
