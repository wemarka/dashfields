/**
 * LoginPage.tsx
 * Supabase Auth — Email/Password + Google OAuth login page
 * Design: Glassmorphism with animated gradient background
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useSupabaseAuth } from "@/core/contexts/SupabaseAuthContext";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { trpc } from "@/core/lib/trpc";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/dashfields-logo-full_61e255da.svg";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { signInWithEmail, isAuthenticated, isLoading } = useSupabaseAuth();
  const utils = trpc.useUtils();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get returnTo from query params
  const returnTo = new URLSearchParams(window.location.search).get("returnTo") ?? "/dashboard";

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation(returnTo);
    }
  }, [isAuthenticated, isLoading, returnTo, setLocation]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError(null);
    setSubmitting(true);
    try {
      const { error: authError } = await signInWithEmail(email, password);
      if (authError) {
        setError(getErrorMessage(authError.message));
        return;
      }
      // Invalidate auth cache so trpc.auth.me refetches
      await utils.auth.me.invalidate();
      toast.success("Welcome back!");
      setLocation(returnTo);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-indigo-900 to-violet-950" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-40 w-80 h-80 bg-violet-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Glass card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div
          className="rounded-2xl border border-white/10 p-8 shadow-2xl"
          style={{
            background: "rgba(255,255,255,0.07)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src={LOGO_URL} alt="Dashfields" className="h-9 brightness-0 invert" />
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
            <p className="text-white/60 text-sm">Sign in to your Dashfields account</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/15 border border-red-500/30 mb-4">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Email/Password form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-white/80 text-sm">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-blue-400/60 focus:ring-blue-400/20 h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-white/80 text-sm">Password</Label>
                <button
                  type="button"
                  onClick={() => setLocation("/forgot-password")}
                  className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-blue-400/60 focus:ring-blue-400/20 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/25 transition-all"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Signing in...</>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          {/* Register link */}
          <p className="text-center text-white/50 text-sm mt-6">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => setLocation("/register")}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Create account
            </button>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-white/25 text-xs mt-6">
          © {new Date().getFullYear()} Dashfields. All rights reserved.
        </p>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getErrorMessage(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "Invalid email or password. Please try again.";
  if (msg.includes("Email not confirmed")) return "Please verify your email address before signing in.";
  if (msg.includes("Too many requests")) return "Too many attempts. Please wait a moment and try again.";
  if (msg.includes("User not found")) return "No account found with this email address.";
  return msg;
}
