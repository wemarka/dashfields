/**
 * AuthCallbackPage.tsx
 * Handles Supabase OAuth callback (Google, email confirmation, password reset)
 * Route: /auth/callback
 */
import { useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/core/lib/supabase";
import { Loader2 } from "lucide-react";
import { trpc } from "@/core/lib/trpc";

export default function AuthCallbackPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!supabase) {
      setLocation("/login");
      return;
    }

    // Supabase handles the hash/code exchange automatically via detectSessionInUrl
    // We just need to wait for the session to be established
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        // Invalidate tRPC auth cache so the app re-fetches user info
        await utils.auth.me.invalidate();
        // Redirect to dashboard
        setLocation("/dashboard");
      } else if (event === "PASSWORD_RECOVERY") {
        // Redirect to reset password page
        setLocation("/auth/reset-password");
      } else if (event === "SIGNED_OUT") {
        setLocation("/login");
      }
    });

    // Also check if session is already available (e.g., page reload)
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        await utils.auth.me.invalidate();
        setLocation("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [setLocation, utils]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-indigo-900 to-violet-950">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-400 mx-auto mb-4" />
        <p className="text-white/60 text-sm">Completing sign in...</p>
      </div>
    </div>
  );
}
