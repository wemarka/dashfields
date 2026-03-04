/**
 * RegisterPage.tsx
 * Supabase Auth — Create new account with email/password or Google OAuth
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useSupabaseAuth } from "@/core/contexts/SupabaseAuthContext";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, User, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/Dashfileds_LOGO_FULL_SVG_e5842d1d.svg";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { signUpWithEmail, signInWithGoogle, isAuthenticated, isLoading } = useSupabaseAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const passwordStrength = getPasswordStrength(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) return;
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { error: authError } = await signUpWithEmail(email, password, name);
      if (authError) {
        setError(getErrorMessage(authError.message));
        return;
      }
      setSuccess(true);
      toast.success("Account created! Please check your email to verify.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    const { error: authError } = await signInWithGoogle();
    if (authError) {
      setError(getErrorMessage(authError.message));
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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center py-8">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-indigo-900 to-violet-950" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl animate-pulse delay-300" />
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

          {success ? (
            /* Success state */
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
              <p className="text-white/60 text-sm mb-6">
                We sent a verification link to <strong className="text-white">{email}</strong>.
                Click the link to activate your account.
              </p>
              <Button
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
                onClick={() => setLocation("/login")}
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              {/* Heading */}
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-white mb-1">Create account</h1>
                <p className="text-white/60 text-sm">Start your free Dashfields account</p>
              </div>

              {/* Google OAuth */}
              <Button
                type="button"
                variant="outline"
                className="w-full mb-4 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white h-11 gap-2"
                onClick={handleGoogleLogin}
              >
                <GoogleIcon />
                Continue with Google
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-white/15" />
                <span className="text-white/40 text-xs uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-white/15" />
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/15 border border-red-500/30 mb-4">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-white/80 text-sm">Full name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      autoComplete="name"
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-blue-400/60 h-11"
                    />
                  </div>
                </div>

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
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-blue-400/60 h-11"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-white/80 text-sm">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-blue-400/60 h-11"
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
                  {/* Password strength indicator */}
                  {password && (
                    <div className="flex gap-1 mt-1.5">
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all ${
                            i <= passwordStrength.score
                              ? passwordStrength.color
                              : "bg-white/15"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-white/80 text-sm">Confirm password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-blue-400/60 h-11"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting || !email || !password || !name}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/25 transition-all"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating account...</>
                  ) : (
                    "Create account"
                  )}
                </Button>
              </form>

              {/* Login link */}
              <p className="text-center text-white/50 text-sm mt-6">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setLocation("/login")}
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  Sign in
                </button>
              </p>
            </>
          )}
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function getPasswordStrength(password: string): { score: number; color: string } {
  if (!password) return { score: 0, color: "bg-white/15" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;
  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500"];
  return { score, color: colors[score - 1] ?? "bg-white/15" };
}

function getErrorMessage(msg: string): string {
  if (msg.includes("User already registered")) return "An account with this email already exists. Please sign in.";
  if (msg.includes("Password should be")) return "Password must be at least 6 characters.";
  if (msg.includes("Invalid email")) return "Please enter a valid email address.";
  return msg;
}
