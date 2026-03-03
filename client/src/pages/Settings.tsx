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
  Sun, Moon, Monitor, Globe, Save, ExternalLink, Key, Plus, Trash2, Eye, EyeOff, ToggleLeft, ToggleRight,
} from "lucide-react";
import { PLATFORMS } from "@shared/platforms";
import { PlatformIcon } from "@/components/PlatformIcon";
import { useTheme } from "@/contexts/ThemeContext";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "@/i18n";

type Section = "account" | "connections" | "notifications" | "appearance" | "apikeys";

const sections: { id: Section; icon: typeof Shield; labelKey: string }[] = [
  { id: "account",       icon: Shield,  labelKey: "settings.account" },
  { id: "connections",   icon: Link2,   labelKey: "connections.title" },
  { id: "notifications", icon: Bell,    labelKey: "settings.notifications" },
  { id: "appearance",    icon: Palette, labelKey: "settings.appearance" },
  { id: "apikeys",       icon: Key,     labelKey: "settings.apiKeys" },
];

// ─── API Keys Section ─────────────────────────────────────────────────────────
function ApiKeysSection() {
  const [showForm, setShowForm] = useState(false);
  const [platform, setPlatform] = useState("facebook");
  const [keyName, setKeyName] = useState("Default");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState<Record<number, boolean>>({});
  const utils = trpc.useUtils();

  const { data: keys = [], isLoading } = trpc.apiKeys.list.useQuery();

  const upsertMutation = trpc.apiKeys.upsert.useMutation({
    onSuccess: () => {
      toast.success("API key saved!");
      setShowForm(false);
      setApiKey("");
      utils.apiKeys.list.invalidate();
    },
    onError: (e) => toast.error("Failed: " + e.message),
  });

  const deleteMutation = trpc.apiKeys.delete.useMutation({
    onSuccess: () => { toast.success("Deleted"); utils.apiKeys.list.invalidate(); },
    onError: (e) => toast.error("Failed: " + e.message),
  });

  const toggleMutation = trpc.apiKeys.toggle.useMutation({
    onSuccess: () => utils.apiKeys.list.invalidate(),
    onError: (e) => toast.error("Failed: " + e.message),
  });

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Platform API Keys</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Store your platform API keys securely for advanced integrations</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Key
          </button>
        </div>

        {/* Add Key Form */}
        {showForm && (
          <div className="bg-muted/50 border border-border rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {PLATFORMS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Key Name</label>
                <input
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g., Production, Test"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your API key here..."
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => upsertMutation.mutate({ platform, keyName, apiKey })}
                disabled={upsertMutation.isPending || !apiKey.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {upsertMutation.isPending ? "Saving..." : "Save Key"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Keys List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-8">
            <Key className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No API keys added yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Add platform API keys to enable advanced integrations</p>
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((k: any) => (
              <div key={k.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <PlatformIcon platform={k.platform} className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{k.platform} — {k.key_name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {showKey[k.id] ? k.masked_key : k.masked_key}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleMutation.mutate({ id: k.id, isActive: !k.is_active })}
                    className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                      k.is_active ? "text-emerald-600 bg-emerald-50" : "text-muted-foreground bg-muted"
                    }`}
                    title={k.is_active ? "Active — click to disable" : "Inactive — click to enable"}
                  >
                    {k.is_active ? "Active" : "Inactive"}
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate({ id: k.id })}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete key"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Language Selector Component ────────────────────────────────────────────
function LanguageSelector() {
  const { i18n } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-muted-foreground" />
      <select
        value={i18n.language}
        onChange={(e) => changeLanguage(e.target.value)}
        className="px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
      >
        <option value="en">English</option>
        <option value="ar">العربية (Arabic)</option>
      </select>
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
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
          <h1 className="text-xl font-bold text-foreground">{t("settings.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("settings.saveSettings")}</p>
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
                {t(s.labelKey)}
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
                <h2 className="text-sm font-semibold text-foreground">{t("settings.accountInfo")}</h2>

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
                    <label className="text-xs text-muted-foreground mb-1.5 block">{t("profile.name")}</label>
                    <input
                      defaultValue={user?.name ?? ""}
                      className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">{t("profile.email")}</label>
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
                    {t("profile.saveChanges")}
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
                    <h2 className="text-sm font-semibold text-foreground">{t("connections.title")}</h2>
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
                                <Check className="w-3 h-3" /> {t("connections.connected")}
                              </span>
                            ) : (
                              <Link href="/connections">
                                <button className="text-xs font-medium text-primary hover:underline px-2.5 py-1 rounded-full border border-primary/30 hover:bg-primary/5 transition-colors">
                                  {t("connections.connect")}
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
                <h2 className="text-sm font-semibold text-foreground mb-4">{t("settings.notifications")}</h2>
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
                    {updateMutation.isPending ? t("common.loading") : t("common.save")}
                  </button>
                </div>
              </div>
            )}

            {/* ── API Keys ────────────────────────────────────────────────── */}
            {active === "apikeys" && (
              <ApiKeysSection />
            )}

            {/* ── Appearance ──────────────────────────────────────────────── */}
            {active === "appearance" && (
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
                <h2 className="text-sm font-semibold text-foreground">{t("settings.appearance")}</h2>

                {/* Theme */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-3">{t("settings.darkMode")}</p>
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
                  <p className="text-xs font-medium text-muted-foreground mb-3">{t("settings.language")}</p>
                  <LanguageSelector />
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
