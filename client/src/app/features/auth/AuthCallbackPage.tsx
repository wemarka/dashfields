/**
 * AuthCallbackPage.tsx
 * Handles Supabase OAuth callback (Google, email confirmation, password reset)
 * Route: /auth/callback
 * Design: Clean white/off-white — matches Settings Dialog palette
 */
import { useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/core/lib/supabase";
import { Loader2 } from "lucide-react";
import { trpc } from "@/core/lib/trpc";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/dashfields-logo-full_b474e724.png";

export default function AuthCallbackPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!supabase) { setLocation("/login"); return; }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        await utils.auth.me.invalidate();
        setLocation("/dashboard");
      } else if (event === "PASSWORD_RECOVERY") {
        setLocation("/auth/reset-password");
      } else if (event === "SIGNED_OUT") {
        setLocation("/login");
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        await utils.auth.me.invalidate();
        setLocation("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [setLocation, utils]);

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
            "Dashfields brings all your ad accounts into one intelligent workspace."
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

      {/* Right panel — loading state */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <img src={LOGO_URL} alt="Dashfields" className="h-7 w-auto object-contain" style={{ filter: "brightness(0)" }} />
          </div>

          <div className="w-14 h-14 rounded-2xl bg-gray-100 border border-[#e5e7eb] flex items-center justify-center mx-auto mb-5">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Completing sign in</h2>
          <p className="text-gray-500 text-sm">Please wait a moment...</p>
        </div>
      </div>
    </div>
  );
}
