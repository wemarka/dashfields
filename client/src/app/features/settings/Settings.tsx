// Settings.tsx — Improved settings page with real data binding.
import DashboardLayout from "@/app/components/DashboardLayout";
import { useAuth } from "@/shared/hooks/useAuth";
import { trpc } from "@/core/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Shield, Bell, Palette, Link2, ChevronRight, Check,
  Sun, Moon, Monitor, Globe, Save, ExternalLink, Key, Plus, Trash2, Eye, EyeOff, ToggleLeft, ToggleRight,
  Download, Clock, Type, Loader2,
} from "lucide-react";
import { PLATFORMS } from "@shared/platforms";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { useTheme } from "@/core/contexts/ThemeContext";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "@/core/i18n";

type Section = "account" | "connections" | "notifications" | "appearance" | "apikeys";

const TIMEZONES = [
  "UTC", "America/New_York", "America/Los_Angeles", "America/Chicago",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Dubai",
  "Asia/Riyadh", "Asia/Amman", "Asia/Beirut", "Asia/Cairo",
  "Asia/Tokyo", "Asia/Singapore", "Australia/Sydney",
];

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
            {keys.map((k) => (
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

// ─── Danger Zone Component ─────────────────────────────────────────────────
function DangerZone() {
  const [confirm, setConfirm] = useState("");
  const [open, setOpen] = useState(false);
  const deleteAccountMutation = trpc.settings.deleteAccount?.useMutation?.({
    onSuccess: () => {
      toast.success("Account deleted. You will be logged out.");
      setTimeout(() => { window.location.href = "/"; }, 2000);
    },
    onError: (e: { message: string }) => toast.error("Failed: " + e.message),
  });
  return (
    <div className="pt-4 border-t border-red-200 dark:border-red-900">
      <h3 className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1 flex items-center gap-1.5">
        <Trash2 className="w-3.5 h-3.5" /> Danger Zone
      </h3>
      <p className="text-xs text-muted-foreground mb-3">Permanently delete your account and all associated data. This action cannot be undone.</p>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-300 dark:border-red-800 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete Account
        </button>
      ) : (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4 space-y-3">
          <p className="text-xs font-medium text-red-700 dark:text-red-400">Type <strong>DELETE</strong> to confirm account deletion:</p>
          <input
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Type DELETE here"
            className="w-full px-3 py-2 rounded-xl bg-background border border-red-300 dark:border-red-700 text-sm text-foreground outline-none focus:ring-2 focus:ring-red-400/30"
          />
          <div className="flex gap-2">
            <button
              onClick={() => deleteAccountMutation?.mutate?.({ confirmation: "DELETE" })}
              disabled={confirm !== "DELETE" || deleteAccountMutation?.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deleteAccountMutation?.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Confirm Delete
            </button>
            <button
              onClick={() => { setOpen(false); setConfirm(""); }}
              className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
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

  // ── Account fields ─────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [currency, setCurrency] = useState("USD");
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  const updateProfileMutation = trpc.settings.updateProfile.useMutation({
    onSuccess: () => { toast.success("Profile updated"); setIsSavingAccount(false); },
    onError: (e) => { toast.error(e.message); setIsSavingAccount(false); },
  });

  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
  }, [user]);

  useEffect(() => {
    if (settings?.timezone) setTimezone(settings.timezone);
    if (settings?.currency) setCurrency(settings.currency);
  }, [settings]);

  const handleSaveAccount = () => {
    setIsSavingAccount(true);
    // Save name
    if (displayName.trim() && displayName.trim() !== user?.name) {
      updateProfileMutation.mutate({ name: displayName.trim() });
    }
    // Save timezone + currency
    updateMutation.mutate({ timezone, currency });
    if (!displayName.trim() || displayName.trim() === user?.name) {
      setIsSavingAccount(false);
    }
  };

  // ── Data Export ────────────────────────────────────────────────────────────
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

  // ── Font size ──────────────────────────────────────────────────────────────
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">("md");
  const fontSizeOptions = [
    { value: "sm", label: "Small",   size: "text-xs" },
    { value: "md", label: "Default", size: "text-sm" },
    { value: "lg", label: "Large",   size: "text-base" },
  ] as const;

  useEffect(() => {
    const root = document.documentElement;
    if (fontSize === "sm") root.style.fontSize = "14px";
    else if (fontSize === "lg") root.style.fontSize = "17px";
    else root.style.fontSize = "16px";
  }, [fontSize]);

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
    ...accounts.map((a) => a.platform),
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
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
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
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {[
                        { code: "USD", label: "USD — US Dollar" },
                        { code: "EUR", label: "EUR — Euro" },
                        { code: "GBP", label: "GBP — British Pound" },
                        { code: "SAR", label: "SAR — Saudi Riyal" },
                        { code: "AED", label: "AED — UAE Dirham" },
                        { code: "EGP", label: "EGP — Egyptian Pound" },
                        { code: "JOD", label: "JOD — Jordanian Dinar" },
                        { code: "KWD", label: "KWD — Kuwaiti Dinar" },
                        { code: "QAR", label: "QAR — Qatari Riyal" },
                        { code: "BHD", label: "BHD — Bahraini Dinar" },
                        { code: "TRY", label: "TRY — Turkish Lira" },
                        { code: "INR", label: "INR — Indian Rupee" },
                        { code: "JPY", label: "JPY — Japanese Yen" },
                        { code: "CAD", label: "CAD — Canadian Dollar" },
                        { code: "AUD", label: "AUD — Australian Dollar" },
                      ].map((c) => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleSaveAccount}
                    disabled={isSavingAccount || updateMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isSavingAccount ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {t("profile.saveChanges")}
                  </button>
                  <p className="text-xs text-muted-foreground">Email is managed by Manus OAuth</p>
                </div>

                {/* Data Export */}
                <div className="pt-4 border-t border-border">
                  <h3 className="text-xs font-semibold text-foreground mb-1">Data Export</h3>
                  <p className="text-xs text-muted-foreground mb-3">Download all your account data as a JSON file</p>
                  <button
                    onClick={() => exportDataMutation?.mutate?.()}
                    disabled={exportDataMutation?.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {exportDataMutation?.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    Export My Data
                  </button>
                </div>
                {/* Danger Zone */}
                <DangerZone />
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

                {/* Font Size */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1">
                    <Type className="w-3 h-3" /> Font Size
                  </p>
                  <div className="flex gap-2">
                    {fontSizeOptions.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => setFontSize(f.value)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium border transition-all ${f.size} ${
                          fontSize === f.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        Aa — {f.label}
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
