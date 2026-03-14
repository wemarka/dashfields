/**
 * ForgotPasswordPage.tsx
 * Supabase Auth — Request password reset email
 * Design: Premium dark gray — consistent with the Topbar-only app shell
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { useSupabaseAuth } from "@/core/contexts/SupabaseAuthContext";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/Dashfileds_ICON_SVG_b923b2b0.svg";

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
      if (authError) { setError(authError.message); return; }
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#141418]">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-10 bg-[#1a1a22] border-r border-white/[0.06]">
        <img src={LOGO_URL} alt="Dashfields" className="h-7 w-auto object-contain brightness-0 invert" />
        <div>
          <blockquote className="text-white/70 text-lg leading-relaxed font-light mb-6">
            "Your account security matters. We'll help you get back in safely."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand/15 flex items-center justify-center text-brand text-sm font-semibold">D</div>
            <div>
              <p className="text-white/90 text-sm font-medium">Dashfields Team</p>
              <p className="text-white/30 text-xs">dashfields.com</p>
            </div>
          </div>
        </div>
        <p className="text-white/15 text-xs">© {new Date().getFullYear()} Dashfields. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <img src={LOGO_URL} alt="Dashfields" className="h-7 w-auto object-contain brightness-0 invert" />
          </div>

          {sent ? (
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-foreground" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
              <p className="text-white/40 text-sm mb-6">
                We sent a password reset link to <strong className="text-white/80">{email}</strong>.
                Check your inbox and follow the instructions.
              </p>
              <Button
                variant="outline"
                className="gap-2 rounded-xl border-white/[0.08] text-white/60 hover:bg-neutral-900/[0.04]"
                onClick={() => setLocation("/login")}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-1">Forgot password?</h1>
                <p className="text-white/40 text-sm">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-[#ef3735]/14 border border-red-500/20 mb-5">
                  <AlertCircle className="w-4 h-4 text-[#a1a1aa] mt-0.5 shrink-0" />
                  <p className="text-[#a1a1aa] text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-white/60 text-sm font-medium">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="pl-10 h-11 bg-neutral-900/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus:border-brand/50 focus:ring-brand/10 rounded-xl"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting || !email}
                  className="w-full h-11 rounded-xl font-medium bg-brand hover:bg-brand-hover text-white transition-colors"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending...</>
                  ) : "Send reset link"}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => setLocation("/login")}
                className="flex items-center gap-1.5 text-white/35 hover:text-white/60 text-sm transition-colors mt-6 mx-auto"
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
