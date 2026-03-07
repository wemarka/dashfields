/**
 * Settings.tsx — App settings tab with FLAT design.
 * No nested cards/borders. Uses typography hierarchy + <hr> separators.
 * Sections: Appearance · Language · Notifications · API Keys · Data · Danger Zone
 */
import { useAuth } from "@/shared/hooks/useAuth";
import { trpc } from "@/core/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Sun, Moon, Monitor, Save, Key, Download, Type, Loader2, Trash2,
} from "lucide-react";
import { useTheme } from "@/core/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { ApiKeysSection, DangerZone, LanguageSelector } from "./components";
import { Switch } from "@/core/components/ui/switch";

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  const { data: settings } = trpc.settings.get.useQuery();
  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => toast.success("Settings saved"),
    onError: (e) => toast.error("Failed: " + e.message),
  });

  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif]   = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);

  useEffect(() => {
    if (settings) {
      setEmailNotif(settings.email_notifications ?? true);
      setPushNotif(settings.push_notifications ?? true);
      setWeeklyReport(settings.weekly_report ?? false);
    }
  }, [settings]);

  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">("md");
  const fontSizeOptions = [
    { value: "sm" as const, label: "Small",   size: "text-xs" },
    { value: "md" as const, label: "Default", size: "text-sm" },
    { value: "lg" as const, label: "Large",   size: "text-base" },
  ];

  useEffect(() => {
    const root = document.documentElement;
    if (fontSize === "sm") root.style.fontSize = "14px";
    else if (fontSize === "lg") root.style.fontSize = "17px";
    else root.style.fontSize = "16px";
  }, [fontSize]);

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark",  label: "Dark",  icon: Moon },
    { value: "system",label: "System",icon: Monitor },
  ] as const;

  const saveNotifications = () => {
    updateMutation.mutate({ emailNotifications: emailNotif, pushNotifications: pushNotif, weeklyReport });
  };

  const exportDataMutation = trpc.settings.exportData?.useMutation?.({
    onSuccess: (data: unknown) => {
      const blob = new Blob([JSON.stringify(data ?? {}, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dashfields-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    },
    onError: (e: { message: string }) => toast.error("Export failed: " + e.message),
  });

  return (
    <div className="px-8 py-6 space-y-0">

      {/* ── Section title ── */}
      <h2 className="text-2xl font-semibold text-foreground mb-6">Settings</h2>

      {/* ── Sub-section: Appearance ── */}
      <h3 className="text-lg font-medium text-foreground mb-4">Appearance</h3>

      <div className="mb-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">Theme</p>
        <div className="flex gap-2">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { if (opt.value !== theme) toggleTheme?.(); }}
              className={[
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all",
                theme === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              ].join(" ")}
            >
              <opt.icon className="w-4 h-4" />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1">
          <Type className="w-3 h-3" /> Font Size
        </p>
        <div className="flex gap-2">
          {fontSizeOptions.map((f) => (
            <button
              key={f.value}
              onClick={() => setFontSize(f.value)}
              className={[
                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium border transition-all",
                f.size,
                fontSize === f.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40",
              ].join(" ")}
            >
              Aa — {f.label}
            </button>
          ))}
        </div>
      </div>

      <hr className="my-6 border-gray-100 dark:border-border/30" />

      {/* ── Sub-section: Language ── */}
      <h3 className="text-lg font-medium text-foreground mb-4">Language</h3>
      <div className="mb-6">
        <LanguageSelector />
      </div>

      <hr className="my-6 border-gray-100 dark:border-border/30" />

      {/* ── Sub-section: Notifications ── */}
      <h3 className="text-lg font-medium text-foreground mb-4">Notifications</h3>

      <div className="space-y-4 mb-4">
        {[
          { label: "Email notifications",       desc: "Receive alerts and updates via email",              value: emailNotif,   set: setEmailNotif },
          { label: "Push notifications",         desc: "In-app alerts for campaigns and budgets",           value: pushNotif,    set: setPushNotif },
          { label: "Weekly performance report",  desc: "Receive a weekly summary of all platforms",         value: weeklyReport, set: setWeeklyReport },
        ].map((n) => (
          <div key={n.label} className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-foreground">{n.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{n.desc}</p>
            </div>
            <Switch checked={n.value} onCheckedChange={n.set} />
          </div>
        ))}
      </div>

      <div className="mb-6">
        <button
          onClick={saveNotifications}
          disabled={updateMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {updateMutation.isPending ? "Saving..." : "Save Notifications"}
        </button>
      </div>

      <hr className="my-6 border-gray-100 dark:border-border/30" />

      {/* ── Sub-section: API Keys ── */}
      <h3 className="text-lg font-medium text-foreground mb-4">API Keys</h3>
      <div className="mb-6">
        <ApiKeysSection />
      </div>

      <hr className="my-6 border-gray-100 dark:border-border/30" />

      {/* ── Sub-section: Data Export ── */}
      <h3 className="text-lg font-medium text-foreground mb-1">Data Export</h3>
      <p className="text-sm text-muted-foreground mb-4">Download all your account data as a JSON file.</p>
      <div className="mb-6">
        <button
          onClick={() => exportDataMutation?.mutate?.()}
          disabled={exportDataMutation?.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
        >
          {exportDataMutation?.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Export My Data
        </button>
      </div>

      <hr className="my-6 border-gray-100 dark:border-border/30" />

      {/* ── Sub-section: Danger Zone ── */}
      <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-1 flex items-center gap-2">
        <Trash2 className="w-4 h-4" /> Danger Zone
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Permanently delete your account and all associated data. This action cannot be undone.
      </p>
      <div className="pb-8">
        <DangerZone />
      </div>
    </div>
  );
}
