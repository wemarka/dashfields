/**
 * Settings.tsx — Settings tab inside the Light Settings Modal.
 * Matches Manus reference: white bg, General (Language + Appearance),
 * Communication preferences with toggles, Manage Cookies at bottom.
 */
import { useState, useEffect } from "react";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { useTheme } from "@/core/contexts/ThemeContext";
import { Switch } from "@/core/components/ui/switch";
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
    <div className="w-full h-14 rounded-lg overflow-hidden" style={{ backgroundColor: "#212121" }}>
      <div className="flex h-full">
        <div className="w-8 h-full" style={{ backgroundColor: "#1e1e1e" }} />
        <div className="flex-1 p-1.5 space-y-1">
          <div className="h-2 rounded" style={{ backgroundColor: "#333", width: "60%" }} />
          <div className="h-1.5 rounded" style={{ backgroundColor: "#383838", width: "80%" }} />
          <div className="h-1.5 rounded" style={{ backgroundColor: "#383838", width: "50%" }} />
        </div>
      </div>
    </div>
  );
  return (
    <div className="w-full h-14 rounded-lg overflow-hidden" style={{ backgroundColor: "#e8e8e8" }}>
      <div className="flex h-full">
        <div className="w-8 h-full" style={{ background: "linear-gradient(to bottom, #1e1e1e 50%, #e0e0e0 50%)" }} />
        <div className="flex-1 p-1.5 space-y-1">
          <div className="h-2 rounded" style={{ background: "linear-gradient(to right, #333 50%, #d0d0d0 50%)", width: "60%" }} />
          <div className="h-1.5 rounded" style={{ backgroundColor: "#d0d0d0", width: "80%" }} />
          <div className="h-1.5 rounded" style={{ backgroundColor: "#d0d0d0", width: "50%" }} />
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

  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif]   = useState(false);

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
      <div className="px-7 pt-6 pb-5" style={{ borderBottom: "1px solid #f0f0f0" }}>
        <h2 className="text-[17px] font-semibold text-white">Settings</h2>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">

        {/* General section */}
        <div className="px-7 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-4 text-neutral-500">General</p>

          {/* Language */}
          <div className="mb-5">
            <p className="text-[13px] font-semibold mb-2 text-white">Language</p>
            <Select value={language} onValueChange={(v) => { setLanguage(v); updateMutation.mutate({ language: v }); }}>
              <SelectTrigger className="w-40 h-9 text-[13px]">
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
            <p className="text-[13px] font-semibold mb-3 text-white">Appearance</p>
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
                        border: isActive ? "2px solid #e62020" : "2px solid #303030",
                        padding: 2,
                      }}
                    >
                      <ThemePreview mode={opt.value} />
                    </div>
                    <span
                      className="text-[12px] font-medium"
                      style={{ color: isActive ? "#e62020" : "#737373" }}
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
        <div className="px-7 py-5" style={{ borderTop: "1px solid #f0f0f0" }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-4 text-neutral-500">Communication preferences</p>

          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold text-white">Receive product updates</p>
                <p className="text-[12px] mt-0.5 leading-snug text-neutral-500">
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
                <p className="text-[13px] font-semibold text-white">Email me when my queued task starts</p>
                <p className="text-[12px] mt-0.5 leading-snug text-neutral-500">
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
        <div className="px-7 py-5" style={{ borderTop: "1px solid #f0f0f0" }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-4 text-neutral-500">API Keys</p>
          <ApiKeysSection />
        </div>

        {/* Manage Cookies */}
        <div
          className="px-7 py-4 flex items-center justify-between"
          style={{ borderTop: "1px solid #f0f0f0" }}
        >
          <span className="text-[13px] text-neutral-400">Manage Cookies</span>
          <button
            onClick={() => toast.info("Cookie preferences coming soon")}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border border-neutral-700"
          >
            Manage
          </button>
        </div>

      </div>
    </div>
  );
}
