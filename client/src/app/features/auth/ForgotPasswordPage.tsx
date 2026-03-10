/**
 * ForgotPasswordPage.tsx
 * Supabase Auth — Request password reset email
 * Design: Clean white/off-white — matches Settings Dialog palette
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { useSupabaseAuth } from "@/core/contexts/SupabaseAuthContext";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/dashfields-icon-512_6023dedc.png";

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
    <div className="min-h-screen flex" style={{ backgroundColor: "#f7f7f8" }}>
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-10"
        style={{ backgroundColor: "#111827" }}
      >
        <img src={LOGO_URL} alt="Dashfields" className="h-7 w-auto object-contain brightness-0 invert" />
        <div>
          <blockquote className="text-white/80 text-lg leading-relaxed font-light mb-6">
            "Your account security matters. We'll help you get back in safely."
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

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <img src={LOGO_URL} alt="Dashfields" className="h-7 w-auto object-contain" style={{ filter: "brightness(0)" }} />
          </div>

          {sent ? (
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
              <p className="text-gray-500 text-sm mb-6">
                We sent a password reset link to <strong className="text-gray-900">{email}</strong>.
                Check your inbox and follow the instructions.
              </p>
              <Button
                variant="outline"
                className="gap-2 rounded-xl border-[#e5e7eb] text-gray-700 hover:bg-gray-50"
                onClick={() => setLocation("/login")}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Forgot password?</h1>
                <p className="text-gray-500 text-sm">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 mb-5">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-gray-700 text-sm font-medium">Email address</Label>
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

                <Button
                  type="submit"
                  disabled={submitting || !email}
                  className="w-full h-11 rounded-xl font-medium"
                  style={{ backgroundColor: "#111827", color: "#fff" }}
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending...</>
                  ) : "Send reset link"}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => setLocation("/login")}
                className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm transition-colors mt-6 mx-auto"
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
