/**
 * LoginPage.tsx
 * Supabase Auth — Email/Password login
 * Design: Clean white/off-white — matches Settings Dialog palette
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

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/dashfields-icon-512_6023dedc.png";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { signInWithEmail, isAuthenticated, isLoading } = useSupabaseAuth();
  const utils = trpc.useUtils();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const returnTo = new URLSearchParams(window.location.search).get("returnTo") ?? "/dashboard";

  useEffect(() => {
    if (!isLoading && isAuthenticated) setLocation(returnTo);
  }, [isAuthenticated, isLoading, returnTo, setLocation]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError(null);
    setSubmitting(true);
    try {
      const { error: authError } = await signInWithEmail(email, password);
      if (authError) { setError(getErrorMessage(authError.message)); return; }
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
    <div className="min-h-screen flex" style={{ backgroundColor: "#f7f7f8" }}>
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-10"
        style={{ backgroundColor: "#111827" }}
      >
        <img src={LOGO_URL} alt="Dashfields" className="h-7 w-auto object-contain brightness-0 invert" />
        <div>
          <blockquote className="text-white/80 text-lg leading-relaxed font-light mb-6">
            "Dashfields brings all your ad accounts into one intelligent workspace — so you can focus on what matters."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white text-sm font-semibold">D</div>
            <div>
              <p className="text-white text-sm font-medium">Dashfields Team</p>
              <p className="text-white/40 text-xs">dashfields.com</p>
            </div>
          </div>
        </div>
        <p className="text-white/20 text-xs">© {new Date().getFullYear()} Dashfields. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <img src={LOGO_URL} alt="Dashfields" className="h-7 w-auto object-contain" style={{ filter: "brightness(0)" }} />
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
            <p className="text-gray-500 text-sm">Sign in to your Dashfields account</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 mb-5">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-700 text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="pl-10 h-11 bg-white border-[#e5e7eb] text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-gray-700 text-sm font-medium">Password</Label>
                <button
                  type="button"
                  onClick={() => setLocation("/forgot-password")}
                  className="text-blue-600 hover:text-blue-700 text-xs font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pl-10 pr-10 h-11 bg-white border-[#e5e7eb] text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/10 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full h-11 rounded-xl font-medium"
              style={{ backgroundColor: "#111827", color: "#fff" }}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Signing in...</>
              ) : "Sign in"}
            </Button>
          </form>

          {/* Register link */}
          <p className="text-center text-gray-500 text-sm mt-6">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => setLocation("/register")}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Create account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function getErrorMessage(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "Invalid email or password. Please try again.";
  if (msg.includes("Email not confirmed")) return "Please verify your email address before signing in.";
  if (msg.includes("Too many requests")) return "Too many attempts. Please wait a moment and try again.";
  if (msg.includes("User not found")) return "No account found with this email address.";
  return msg;
}
