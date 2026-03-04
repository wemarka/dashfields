/**
 * ForgotPasswordPage.tsx
 * Supabase Auth — Request password reset email
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { useSupabaseAuth } from "@/core/contexts/SupabaseAuthContext";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/Dashfileds_LOGO_FULL_SVG_e5842d1d.svg";

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const { resetPassword } = useSupabaseAuth();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError(null);
    setSubmitting(true);
    try {
      const { error: authError } = await resetPassword(email);
      if (authError) {
        setError(authError.message);
        return;
      }
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-indigo-900 to-violet-950" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-violet-500/20 rounded-full blur-3xl animate-pulse delay-700" />
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

          {sent ? (
            /* Success state */
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
              <p className="text-white/60 text-sm mb-6">
                We sent a password reset link to <strong className="text-white">{email}</strong>.
                Check your inbox and follow the instructions.
              </p>
              <Button
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white gap-2"
                onClick={() => setLocation("/login")}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              {/* Heading */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-white mb-1">Forgot password?</h1>
                <p className="text-white/60 text-sm">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/15 border border-red-500/30 mb-4">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-white/80 text-sm">Email address</Label>
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
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-blue-400/60 h-11"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting || !email}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/25"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending...</>
                  ) : (
                    "Send reset link"
                  )}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => setLocation("/login")}
                className="flex items-center gap-1.5 text-white/50 hover:text-white/80 text-sm transition-colors mt-6 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
