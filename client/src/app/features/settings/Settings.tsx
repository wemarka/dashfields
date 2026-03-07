/**
 * Settings.tsx — Settings tab inside the dark Settings Modal.
 * Matches Manus reference: dark bg, General section (Language + Appearance),
 * Communication preferences with toggles, Manage Cookies at bottom.
 */
import { useState, useEffect } from "react";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { useTheme } from "@/core/contexts/ThemeContext";
import { Switch } from "@/core/components/ui/switch";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { ApiKeysSection } from "./components";

// ─── Theme preview thumbnails ─────────────────────────────────────────────────
function ThemePreview({ mode }: { mode: "light" | "dark" | "system" }) {
  if (mode === "light") return (
    <div className="w-full h-14 rounded-lg overflow-hidden" style={{ backgroundColor: "#f5f5f5" }}>
      <div className="flex h-full">
        <div className="w-8 h-full" style={{ backgroundColor: "#e0e0e0" }} />
        <div className="flex-1 p-1.5 space-y-1">
          <div className="h-2 rounded" style={{ backgroundColor: "#d0d0d0", width: "60%" }} />
          <div className="h-1.5 rounded" style={{ backgroundColor: "#e0e0e0", width: "80%" }} />
          <div className="h-1.5 rounded" style={{ backgroundColor: "#e0e0e0", width: "50%" }} />
        </div>
      </div>
    </div>
  );
  if (mode === "dark") return (
    <div className="w-full h-14 rounded-lg overflow-hidden" style={{ backgroundColor: "#1a1a1a" }}>
      <div className="flex h-full">
        <div className="w-8 h-full" style={{ backgroundColor: "#111" }} />
        <div className="flex-1 p-1.5 space-y-1">
          <div className="h-2 rounded" style={{ backgroundColor: "#333", width: "60%" }} />
          <div className="h-1.5 rounded" style={{ backgroundColor: "#2a2a2a", width: "80%" }} />
          <div className="h-1.5 rounded" style={{ backgroundColor: "#2a2a2a", width: "50%" }} />
        </div>
      </div>
    </div>
  );
  // system
  return (
    <div className="w-full h-14 rounded-lg overflow-hidden" style={{ backgroundColor: "#2a2a2a" }}>
      <div className="flex h-full">
        <div className="w-8 h-full" style={{ background: "linear-gradient(to bottom, #111 50%, #e0e0e0 50%)" }} />
        <div className="flex-1 p-1.5 space-y-1">
          <div className="h-2 rounded" style={{ background: "linear-gradient(to right, #333 50%, #d0d0d0 50%)", width: "60%" }} />
          <div className="h-1.5 rounded" style={{ backgroundColor: "#2a2a2a", width: "80%" }} />
          <div className="h-1.5 rounded" style={{ backgroundColor: "#2a2a2a", width: "50%" }} />
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const [language, setLanguage] = useState("en");

  const { data: settings } = trpc.settings.get.useQuery();
  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => toast.success("Settings saved"),
    onError: (e) => toast.error("Failed: " + e.message),
  });

  const [emailNotif, setEmailNotif]     = useState(true);
  const [pushNotif, setPushNotif]       = useState(false);

  useEffect(() => {
    if (settings) {
      setEmailNotif(settings.email_notifications ?? true);
      setPushNotif(settings.push_notifications ?? false);
      if (settings.language) setLanguage(settings.language);
    }
  }, [settings]);

  const handleThemeSelect = (mode: "light" | "dark" | "system") => {
    if (mode !== theme) toggleTheme?.();
  };

  const themeOptions: { value: "light" | "dark" | "system"; label: string }[] = [
    { value: "light",  label: "Light" },
    { value: "dark",   label: "Dark" },
    { value: "system", label: "Follow System" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="px-7 pt-6 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <h2 className="text-[17px] font-semibold" style={{ color: "rgba(255,255,255,0.95)" }}>Settings</h2>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">

        {/* General section */}
        <div className="px-7 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>General</p>

          {/* Language */}
          <div className="mb-5">
            <p className="text-[13px] font-semibold mb-2" style={{ color: "rgba(255,255,255,0.85)" }}>Language</p>
            <Select value={language} onValueChange={(v) => { setLanguage(v); updateMutation.mutate({ language: v }); }}>
              <SelectTrigger className="w-40 h-9 text-[13px] bg-white/8 border-white/10 text-white/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">Arabic (العربية)</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Appearance */}
          <div>
            <p className="text-[13px] font-semibold mb-3" style={{ color: "rgba(255,255,255,0.85)" }}>Appearance</p>
            <div className="flex gap-3">
              {themeOptions.map((opt) => {
                const isActive = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleThemeSelect(opt.value)}
                    className="flex flex-col items-center gap-2 transition-all"
                    style={{ width: 96 }}
                  >
                    <div
                      className="w-full rounded-xl overflow-hidden transition-all"
                      style={{
                        border: isActive ? "2px solid #3b82f6" : "2px solid rgba(255,255,255,0.1)",
                        padding: 2,
                      }}
                    >
                      <ThemePreview mode={opt.value} />
                    </div>
                    <span
                      className="text-[12px] font-medium"
                      style={{ color: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)" }}
                    >
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Communication preferences */}
        <div className="px-7 py-5" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>Communication preferences</p>

          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>Receive product updates</p>
                <p className="text-[12px] mt-0.5 leading-snug" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Receive early access to feature releases and success stories to optimize your workflow.
                </p>
              </div>
              <Switch
                checked={emailNotif}
                onCheckedChange={(v) => { setEmailNotif(v); updateMutation.mutate({ emailNotifications: v }); }}
                className="shrink-0 mt-0.5"
              />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>Email me when my queued task starts</p>
                <p className="text-[12px] mt-0.5 leading-snug" style={{ color: "rgba(255,255,255,0.35)" }}>
                  When enabled, we'll send you a timely email once your task finishes queuing and begins processing.
                </p>
              </div>
              <Switch
                checked={pushNotif}
                onCheckedChange={(v) => { setPushNotif(v); updateMutation.mutate({ pushNotifications: v }); }}
                className="shrink-0 mt-0.5"
              />
            </div>
          </div>
        </div>

        {/* API Keys */}
        <div className="px-7 py-5" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>API Keys</p>
          <ApiKeysSection />
        </div>

        {/* Manage Cookies */}
        <div
          className="px-7 py-4 flex items-center justify-between"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>Manage Cookies</span>
          <button
            onClick={() => toast.info("Cookie preferences coming soon")}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
            style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.12)" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.12)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")}
          >
            Manage
          </button>
        </div>

      </div>
    </div>
  );
}
