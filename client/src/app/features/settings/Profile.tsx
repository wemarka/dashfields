/**
 * Profile.tsx — Account settings tab with FLAT design.
 * No nested cards/borders. Uses typography hierarchy + <hr> separators.
 */
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/core/lib/trpc";
import { useAuth } from "@/shared/hooks/useAuth";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Switch } from "@/core/components/ui/switch";
import { Badge } from "@/core/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { User, Globe, Bell, Shield, Calendar, Clock, Save, Loader2, Camera, Edit2, Check, X, Mail } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import i18n from "@/core/i18n";
import { usePageTitle } from "@/shared/hooks/usePageTitle";

const TIMEZONES = [
  "UTC", "America/New_York", "America/Los_Angeles", "America/Chicago",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Dubai",
  "Asia/Riyadh", "Asia/Amman", "Asia/Beirut", "Asia/Cairo",
  "Asia/Tokyo", "Asia/Singapore", "Australia/Sydney",
];

export default function Profile() {
  usePageTitle("Profile");
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: settings, isLoading } = trpc.settings.get.useQuery();

  const [timezone, setTimezone]               = useState("UTC");
  const [language, setLanguage]               = useState("en");
  const [emailNotifications, setEmailNotif]   = useState(true);
  const [pushNotifications, setPushNotif]     = useState(true);
  const [weeklyReport, setWeeklyReport]       = useState(false);
  const [alertThresholdCtr, setAlertCtr]      = useState("1.0");
  const [alertThresholdCpc, setAlertCpc]      = useState("2.0");
  const [alertThresholdSpend, setAlertSpend]  = useState("80");
  const [isSaving, setIsSaving]               = useState(false);

  const [avatarUrl, setAvatarUrl]               = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isEditingName, setIsEditingName]       = useState(false);
  const [displayName, setDisplayName]           = useState("");
  const [isSavingName, setIsSavingName]         = useState(false);

  useEffect(() => {
    if (!settings) return;
    if (settings.timezone)              setTimezone(settings.timezone);
    if (settings.language)              setLanguage(settings.language);
    if (settings.email_notifications !== undefined) setEmailNotif(settings.email_notifications);
    if (settings.push_notifications  !== undefined) setPushNotif(settings.push_notifications);
    if (settings.weekly_report       !== undefined) setWeeklyReport(settings.weekly_report);
    if (settings.alert_threshold_ctr)   setAlertCtr(settings.alert_threshold_ctr);
    if (settings.alert_threshold_cpc)   setAlertCpc(settings.alert_threshold_cpc);
    if (settings.alert_threshold_spend) setAlertSpend(settings.alert_threshold_spend);
  }, [settings]);

  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
  }, [user]);

  const updateSettings = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
      toast.success("Settings saved successfully");
      setIsSaving(false);
    },
    onError: (err) => {
      toast.error("Failed to save: " + err.message);
      setIsSaving(false);
    },
  });

  const updateProfileMutation = trpc.settings.updateProfile.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      toast.success("Display name updated");
      setIsEditingName(false);
      setIsSavingName(false);
    },
    onError: (err) => {
      toast.error(err.message);
      setIsSavingName(false);
    },
  });

  const uploadAvatarMutation = trpc.settings.uploadAvatar.useMutation({
    onSuccess: (data) => {
      setAvatarUrl(data.url);
      utils.auth.me.invalidate();
      toast.success("Profile picture updated");
      setIsUploadingAvatar(false);
    },
    onError: (err) => {
      toast.error(err.message);
      setIsUploadingAvatar(false);
    },
  });

  const handleSave = () => {
    setIsSaving(true);
    updateSettings.mutate({
      timezone, language,
      emailNotifications, pushNotifications, weeklyReport,
      alertThresholdCtr, alertThresholdCpc, alertThresholdSpend,
    });
    if (language !== i18n.language) i18n.changeLanguage(language);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
    setIsUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadAvatarMutation.mutate({ base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveName = () => {
    if (!displayName.trim()) return;
    setIsSavingName(true);
    updateProfileMutation.mutate({ name: displayName.trim() });
  };

  const currentAvatarUrl = avatarUrl || (user as Record<string, unknown>)?.avatarUrl as string | undefined;
  const initials = (displayName || user?.name || "U").charAt(0).toUpperCase();

  return (
    <div className="px-8 py-6 space-y-0">

      {/* ── Section: Account Information ── */}
      <h2 className="text-2xl font-semibold text-foreground mb-6">Account</h2>

      {/* Avatar + name row */}
      <div className="flex items-center gap-5 mb-6">
        {/* Avatar */}
        <div className="relative group shrink-0">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-white text-xl font-bold overflow-hidden">
            {currentAvatarUrl ? (
              <img src={currentAvatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAvatar}
            className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            {isUploadingAvatar ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Camera className="w-5 h-5 text-white" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {/* Name + email */}
        <div className="flex-1 min-w-0">
          {isEditingName ? (
            <div className="flex items-center gap-2 mb-1">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-8 text-sm font-semibold max-w-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") setIsEditingName(false);
                }}
                autoFocus
              />
              <button
                onClick={handleSaveName}
                disabled={isSavingName}
                className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                {isSavingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button
                onClick={() => { setIsEditingName(false); setDisplayName(user?.name ?? ""); }}
                className="p-1 rounded-md text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-foreground">{displayName || user?.name || "—"}</p>
              <button
                onClick={() => setIsEditingName(true)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <p className="text-sm text-muted-foreground">{user?.email ?? "—"}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant="secondary" className="text-xs capitalize">
              <Shield className="h-3 w-3 mr-1" />
              {user?.role ?? "user"}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {(user as Record<string, unknown>)?.loginMethod as string ?? "oauth"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Meta info */}
      <div className="flex items-center gap-8 text-sm text-muted-foreground mb-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>Joined: {user?.createdAt ? new Date(user.createdAt as unknown as string).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>Last sign in: {(user as Record<string, unknown>)?.lastSignedIn ? new Date((user as Record<string, unknown>).lastSignedIn as string).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}</span>
        </div>
      </div>

      <hr className="my-6 border-gray-100 dark:border-border/30" />

      {/* ── Sub-section: Preferences ── */}
      <h3 className="text-lg font-medium text-foreground mb-4">Preferences</h3>

      {isLoading ? (
        <div className="space-y-3 mb-6">
          {[1, 2].map(i => <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(tz => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-full">
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
        </div>
      )}

      <hr className="my-6 border-gray-100 dark:border-border/30" />

      {/* ── Sub-section: Notification Preferences ── */}
      <h3 className="text-lg font-medium text-foreground mb-4">Notification Preferences</h3>

      <div className="space-y-4 mb-6">
        {[
          { label: "Email Notifications", desc: "Receive alerts and reports via email", value: emailNotifications, onChange: setEmailNotif },
          { label: "Push Notifications",  desc: "In-app notifications for real-time alerts", value: pushNotifications, onChange: setPushNotif },
          { label: "Weekly Report Email", desc: "Get a weekly performance summary every Monday", value: weeklyReport, onChange: setWeeklyReport },
        ].map(({ label, desc, value, onChange }) => (
          <div key={label} className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
            <Switch checked={value} onCheckedChange={onChange} />
          </div>
        ))}
      </div>

      <hr className="my-6 border-gray-100 dark:border-border/30" />

      {/* ── Sub-section: Alert Thresholds ── */}
      <h3 className="text-lg font-medium text-foreground mb-1">Alert Thresholds</h3>
      <p className="text-sm text-muted-foreground mb-4">Get notified when metrics drop below these values.</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="space-y-2">
          <Label>Min CTR (%)</Label>
          <Input
            type="number" step="0.1" min="0"
            value={alertThresholdCtr}
            onChange={(e) => setAlertCtr(e.target.value)}
            placeholder="e.g. 1.0"
          />
          <p className="text-xs text-muted-foreground">Alert when CTR falls below this</p>
        </div>
        <div className="space-y-2">
          <Label>Max CPC ($)</Label>
          <Input
            type="number" step="0.01" min="0"
            value={alertThresholdCpc}
            onChange={(e) => setAlertCpc(e.target.value)}
            placeholder="e.g. 2.00"
          />
          <p className="text-xs text-muted-foreground">Alert when CPC exceeds this</p>
        </div>
        <div className="space-y-2">
          <Label>Budget Warning (%)</Label>
          <Input
            type="number" step="5" min="50" max="100"
            value={alertThresholdSpend}
            onChange={(e) => setAlertSpend(e.target.value)}
            placeholder="e.g. 80"
          />
          <p className="text-xs text-muted-foreground">Alert when budget usage exceeds this</p>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end pb-6">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2 min-w-36">
          {isSaving ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
          ) : (
            <><Save className="h-4 w-4" />Save Changes</>
          )}
        </Button>
      </div>
    </div>
  );
}
