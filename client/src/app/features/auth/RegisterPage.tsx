/**
 * RegisterPage.tsx
 * Supabase Auth — Create new account
 * Design: Premium dark gray — consistent with the Topbar-only app shell
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useSupabaseAuth } from "@/core/contexts/SupabaseAuthContext";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, User, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/Dashfileds_ICON_SVG_b923b2b0.svg";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { signUpWithEmail, isAuthenticated, isLoading } = useSupabaseAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) setLocation("/dashboard");
  }, [isAuthenticated, isLoading, setLocation]);

  const passwordStrength = getPasswordStrength(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) return;
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError(null);
    setSubmitting(true);
    try {
      const { error: authError } = await signUpWithEmail(email, password, name);
      if (authError) { setError(getErrorMessage(authError.message)); return; }
      setSuccess(true);
      toast.success("Account created! Please check your email to verify.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#0a0a0f]">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-10 bg-[#0f0f17] border-r border-white/[0.06]">
        <img src={LOGO_URL} alt="Dashfields" className="h-7 w-auto object-contain brightness-0 invert" />
        <div>
          <blockquote className="text-white/70 text-lg leading-relaxed font-light mb-6">
            "Join thousands of marketers who manage their ad campaigns smarter with Dashfields."
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

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 py-10">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <img src={LOGO_URL} alt="Dashfields" className="h-7 w-auto object-contain brightness-0 invert" />
          </div>

          {success ? (
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
              <p className="text-white/40 text-sm mb-6">
                We sent a verification link to <strong className="text-white/80">{email}</strong>.
                Click the link to activate your account.
              </p>
              <Button
                variant="outline"
                className="gap-2 rounded-xl border-white/[0.08] text-white/60 hover:bg-neutral-900/[0.04]"
                onClick={() => setLocation("/login")}
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-1">Create account</h1>
                <p className="text-white/40 text-sm">Start your free Dashfields account</p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-5">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-white/60 text-sm font-medium">Full name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <Input id="name" type="text" placeholder="Your name" value={name}
                      onChange={e => setName(e.target.value)} required autoComplete="name"
                      className="pl-10 h-11 bg-neutral-900/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus:border-brand/50 focus:ring-brand/10 rounded-xl" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-white/60 text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <Input id="email" type="email" placeholder="you@example.com" value={email}
                      onChange={e => setEmail(e.target.value)} required autoComplete="email"
                      className="pl-10 h-11 bg-neutral-900/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus:border-brand/50 focus:ring-brand/10 rounded-xl" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-white/60 text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="Min. 8 characters"
                      value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password"
                      className="pl-10 pr-10 h-11 bg-neutral-900/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus:border-brand/50 focus:ring-brand/10 rounded-xl" />
                    <button type="button" onClick={() => setShowPassword(v => !v)} tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="flex gap-1 mt-1.5">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= passwordStrength.score ? passwordStrength.color : "bg-neutral-900/[0.06]"}`} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-white/60 text-sm font-medium">Confirm password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <Input id="confirmPassword" type={showPassword ? "text" : "password"} placeholder="Repeat password"
                      value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required autoComplete="new-password"
                      className="pl-10 h-11 bg-neutral-900/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus:border-brand/50 focus:ring-brand/10 rounded-xl" />
                  </div>
                </div>

                <Button type="submit" disabled={submitting || !email || !password || !name}
                  className="w-full h-11 rounded-xl font-medium bg-brand hover:bg-brand text-white transition-colors">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating account...</> : "Create account"}
                </Button>
              </form>

              <p className="text-center text-white/35 text-sm mt-6">
                Already have an account?{" "}
                <button type="button" onClick={() => setLocation("/login")}
                  className="text-brand hover:text-brand font-medium transition-colors">
                  Sign in
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function getPasswordStrength(password: string): { score: number; color: string } {
  if (!password) return { score: 0, color: "bg-neutral-900/[0.06]" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;
  const colors = ["bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-emerald-500"];
  return { score, color: colors[score - 1] ?? "bg-neutral-900/[0.06]" };
}

function getErrorMessage(msg: string): string {
  if (msg.includes("User already registered")) return "An account with this email already exists. Please sign in.";
  if (msg.includes("Password should be")) return "Password must be at least 6 characters.";
  if (msg.includes("Invalid email")) return "Please enter a valid email address.";
  return msg;
}
