// shared/hooks/useAuth.ts
// Unified auth hook — Supabase is the sole auth provider.
// Replaces the old split between useAuth (tRPC) + useSupabaseAuth (Supabase).
//
// Provides:
//   user          — public.users record from tRPC (has id, name, email, role)
//   session       — raw Supabase Session (has access_token, expires_at, etc.)
//   supabaseUser  — raw Supabase User object
//   isLoading     — true while initial auth state is being resolved
//   isAuthenticated — true when a valid session exists
//   signOut       — signs out via Supabase then redirects to /login
//   signInWithEmail / signUpWithEmail / signInWithGoogle / resetPassword / updatePassword
//   refresh       — re-fetch the tRPC user profile
//   logout        — alias for signOut (backward compat)

import { useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useSupabaseAuth } from "@/core/contexts/SupabaseAuthContext";
import { trpc } from "@/core/lib/trpc";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } =
    options ?? {};

  const [, navigate] = useLocation();

  // ── Supabase session state ────────────────────────────────────────────────
  const {
    status,
    session,
    supabaseUser,
    isLoading: supabaseLoading,
    isAuthenticated,
    signOut: supabaseSignOut,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    resetPassword,
    updatePassword,
    refreshSession,
  } = useSupabaseAuth();

  // ── tRPC user profile (only when authenticated) ───────────────────────────
  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const loading = supabaseLoading || (isAuthenticated && meQuery.isLoading);
  const user = meQuery.data ?? null;

  // ── Redirect when unauthenticated ─────────────────────────────────────────
  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (loading) return;
    if (status === "loading") return;
    if (isAuthenticated) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;
    navigate(redirectPath);
  }, [redirectOnUnauthenticated, redirectPath, loading, status, isAuthenticated, navigate]);

  // ── Sign out: Supabase + redirect ─────────────────────────────────────────
  const signOut = useCallback(async () => {
    await supabaseSignOut();
    navigate("/login");
  }, [supabaseSignOut, navigate]);

  return {
    // Profile data
    user,
    session,
    supabaseUser,

    // Status
    loading,
    isLoading: loading,
    isAuthenticated,
    error: meQuery.error ?? null,

    // Actions
    signOut,
    logout: signOut,           // backward compat alias
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    resetPassword,
    updatePassword,
    refreshSession,
    refresh: () => meQuery.refetch(),
  };
}
