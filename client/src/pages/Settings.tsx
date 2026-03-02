/**
 * Settings.tsx — Improved settings page with real data binding.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Shield, Bell, Palette, Link2, ChevronRight, Check,
  Sun, Moon, Monitor, Globe, Save, ExternalLink,
} from "lucide-react";
import { PLATFORMS } from "@shared/platforms";
import { PlatformIcon } from "@/components/PlatformIcon";
import { useTheme } from "@/contexts/ThemeContext";
import { Link } from "wouter";

type Section = "account" | "connections" | "notifications" | "appearance";

const sections: { id: Section; icon: typeof Shield; label: string }[] = [
  { id: "account",       icon: Shield,  label: "Account" },
  { id: "connections",   icon: Link2,   label: "Connections" },
  { id: "notifications", icon: Bell,    label: "Notifications" },
  { id: "appearance",    icon: Palette, label: "Appearance" },
];

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [active, setActive] = useState<Section>("account");

  // ── Settings data ──────────────────────────────────────────────────────────
  const { data: settings } = trpc.settings.get.useQuery();
  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => toast.success("Settings saved"),
    onError:   (e) => toast.error("Failed: " + e.message),
  });

  // ── Notification toggles (local state synced with settings) ───────────────
  const [emailNotif,  setEmailNotif]  = useState(true);
  const [pushNotif,   setPushNotif]   = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);

  useEffect(() => {
    if (settings) {
      setEmailNotif(settings.email_notifications ?? true);
      setPushNotif(settings.push_notifications   ?? true);
      setWeeklyReport(settings.weekly_report     ?? false);
    }
  }, [settings]);

  // ── Connected platforms ────────────────────────────────────────────────────
  const { data: accounts = [] } = trpc.social.list.useQuery();
  const { data: metaStatus }    = trpc.meta.connectionStatus.useQuery();

  const connectedPlatformIds = new Set([
    ...accounts.map((a: any) => a.platform),
    ...(metaStatus?.connected ? ["facebook"] : []),
  ]);

  // ── Appearance ─────────────────────────────────────────────────────────────
  const themeOptions = [
    { value: "light",  label: "Light",  icon: Sun },
    { value: "dark",   label: "Dark",   icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  const saveNotifications = () => {
    updateMutation.mutate({
      emailNotifications: emailNotif,
      pushNotifications:  pushNotif,
      weeklyReport,
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto animate-fade-in">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your account, connections, and preferences</p>
        </div>

        <div className="flex gap-5">
          {/* Sidebar */}
          <div className="bg-card border border-border rounded-2xl p-2 w-48 shrink-0 h-fit space-y-0.5 shadow-sm">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  active === s.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <s.icon className="w-4 h-4 shrink-0" />
                {s.label}
                {s.id === "connections" && connectedPlatformIds.size > 0 && (
                  <span className="ml-auto text-[10px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                    {connectedPlatformIds.size}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* ── Account ─────────────────────────────────────────────────── */}
            {active === "account" && (
              <div className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-sm">
                <h2 className="text-sm font-semibold text-foreground">Account Information</h2>

                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                    {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{user?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{user?.email ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                      Role: <span className="font-medium">{user?.role ?? "user"}</span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Display Name</label>
                    <input
                      defaultValue={user?.name ?? ""}
                      className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
                    <input
                      defaultValue={user?.email ?? ""}
                      disabled
                      className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm text-muted-foreground outline-none cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                    <Save className="w-3.5 h-3.5" />
                    Save Changes
                  </button>
                  <p className="text-xs text-muted-foreground">Changes to name only; email is managed by Manus OAuth</p>
                </div>
              </div>
            )}

            {/* ── Connections ─────────────────────────────────────────────── */}
            {active === "connections" && (
              <div className="space-y-3">
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-foreground">Connected Platforms</h2>
                    <Link href="/connections">
                      <button className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                        Manage all <ExternalLink className="w-3 h-3" />
                      </button>
                    </Link>
                  </div>

                  <div className="space-y-2">
                    {PLATFORMS.map((p) => {
                      const isConnected = connectedPlatformIds.has(p.id);
                      return (
                        <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl ${p.bgLight} flex items-center justify-center`}>
                              <PlatformIcon platform={p.id} className={`w-4.5 h-4.5 ${p.textColor}`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{p.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{p.connectionType} connection</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isConnected ? (
                              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                <Check className="w-3 h-3" /> Connected
                              </span>
                            ) : (
                              <Link href="/connections">
                                <button className="text-xs font-medium text-primary hover:underline px-2.5 py-1 rounded-full border border-primary/30 hover:bg-primary/5 transition-colors">
                                  Connect
                                </button>
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Notifications ────────────────────────────────────────────── */}
            {active === "notifications" && (
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-foreground mb-4">Notification Preferences</h2>
                <div className="space-y-1">
                  {[
                    {
                      label: "Email notifications",
                      desc:  "Receive alerts and updates via email",
                      value: emailNotif,
                      set:   setEmailNotif,
                    },
                    {
                      label: "Push notifications",
                      desc:  "In-app alerts for campaigns and budgets",
                      value: pushNotif,
                      set:   setPushNotif,
                    },
                    {
                      label: "Weekly performance report",
                      desc:  "Receive a weekly summary of all platforms",
                      value: weeklyReport,
                      set:   setWeeklyReport,
                    },
                  ].map((n) => (
                    <div key={n.label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{n.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.desc}</p>
                      </div>
                      <button
                        onClick={() => n.set(!n.value)}
                        className={`w-11 h-6 rounded-full relative transition-colors ${n.value ? "bg-primary" : "bg-muted-foreground/30"}`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${n.value ? "left-6" : "left-1"}`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="pt-4">
                  <button
                    onClick={saveNotifications}
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {updateMutation.isPending ? "Saving…" : "Save Preferences"}
                  </button>
                </div>
              </div>
            )}

            {/* ── Appearance ──────────────────────────────────────────────── */}
            {active === "appearance" && (
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
                <h2 className="text-sm font-semibold text-foreground">Appearance</h2>

                {/* Theme */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-3">Theme</p>
                  <div className="flex gap-2">
                    {themeOptions.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => { if (t.value !== theme) toggleTheme?.(); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                          theme === t.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        <t.icon className="w-4 h-4" />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-3">Language</p>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <select className="px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30">
                      <option value="en">English</option>
                      <option value="ar">Arabic (العربية)</option>
                      <option value="fr">French (Français)</option>
                      <option value="es">Spanish (Español)</option>
                    </select>
                  </div>
                </div>

                {/* Density */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-3">Interface Density</p>
                  <div className="flex gap-2">
                    {["Compact", "Default", "Comfortable"].map((d) => (
                      <button
                        key={d}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                          d === "Default"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
