/**
 * ResetPasswordPage.tsx
 * Supabase Auth — Set new password after clicking reset link
 * Route: /auth/reset-password (Supabase redirects here)
 * Design: Clean white/off-white split-panel — matches Settings Dialog palette
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useSupabaseAuth } from "@/core/contexts/SupabaseAuthContext";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/core/lib/supabase";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/Dashfileds_ICON_SVG_b923b2b0.svg";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const { updatePassword } = useSupabaseAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    if (!supabase) { setError("Authentication service not available."); return; }
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setSessionReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) return;
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError(null);
    setSubmitting(true);
    try {
      const { error: authError } = await updatePassword(password);
      if (authError) { setError(authError.message); return; }
      setSuccess(true);
      toast.success("Password updated successfully!");
      setTimeout(() => setLocation("/dashboard"), 2000);
    } finally {
      setSubmitting(false);
    }
  };

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
            "Your account security matters. Choose a strong password to keep your data safe."
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

          {success ? (
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Password updated!</h2>
              <p className="text-gray-500 text-sm">Redirecting you to the dashboard...</p>
              <div className="mt-4 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Set new password</h1>
                <p className="text-gray-500 text-sm">Choose a strong password for your account.</p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 mb-5">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {!sessionReady && !error && (
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-5 p-3 rounded-xl bg-gray-50 border border-[#e5e7eb]">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  Verifying reset link...
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-gray-700 text-sm font-medium">New password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      disabled={!sessionReady}
                      autoComplete="new-password"
                      className="pl-10 pr-10 h-11 bg-white border-[#e5e7eb] text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/10 rounded-xl disabled:opacity-50 disabled:bg-gray-50"
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

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-gray-700 text-sm font-medium">Confirm new password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      disabled={!sessionReady}
                      autoComplete="new-password"
                      className="pl-10 h-11 bg-white border-[#e5e7eb] text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/10 rounded-xl disabled:opacity-50 disabled:bg-gray-50"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting || !password || !confirmPassword || !sessionReady}
                  className="w-full h-11 rounded-xl font-medium"
                  style={{ backgroundColor: "#111827", color: "#fff" }}
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />Updating...</>
                  ) : "Update password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
