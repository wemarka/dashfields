/**
 * Profile page — user info + settings from Supabase via tRPC
 */
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Mail, Globe, Bell, Shield, Calendar, Clock, Save, Loader2, Camera, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

const TIMEZONES = [
  "UTC", "America/New_York", "America/Los_Angeles", "America/Chicago",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Dubai",
  "Asia/Riyadh", "Asia/Amman", "Asia/Beirut", "Asia/Cairo",
  "Asia/Tokyo", "Asia/Singapore", "Australia/Sydney",
];

export default function Profile() {
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

  // Avatar state
  const [avatarUrl, setAvatarUrl]   = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Display name edit state
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName]     = useState("");
  const [isSavingName, setIsSavingName]   = useState(false);

  // Populate from Supabase
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
      toast.success(t("common.saveSuccess", "Settings saved successfully"));
      setIsSaving(false);
    },
    onError: (err) => {
      toast.error(t("common.saveError", "Failed to save: ") + err.message);
      setIsSaving(false);
    },
  });

  const updateProfileMutation = trpc.settings.updateProfile.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      toast.success(t("profile.nameSaved", "Display name updated"));
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
      toast.success(t("profile.avatarUpdated", "Profile picture updated"));
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
      timezone,
      language,
      emailNotifications,
      pushNotifications,
      weeklyReport,
      alertThresholdCtr,
      alertThresholdCpc,
      alertThresholdSpend,
    });
    // Sync language to i18n immediately
    if (language !== i18n.language) {
      i18n.changeLanguage(language);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    setIsUploadingAvatar(true);
    // Convert to base64 for upload
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
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="page-header">{t("profile.title")}</h1>
        <p className="page-subtitle">{t("profile.subtitle")}</p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-brand" />
            {t("profile.accountInfo")}
          </CardTitle>
          <CardDescription>{t("profile.accountInfoDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {/* Avatar with upload */}
            <div className="relative group shrink-0">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-brand to-violet-500 flex items-center justify-center text-white text-xl font-bold overflow-hidden">
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

            <div className="flex-1 min-w-0">
              {/* Editable display name */}
              {isEditingName ? (
                <div className="flex items-center gap-2 mb-1">
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-8 text-sm font-semibold"
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
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs capitalize">
                  <Shield className="h-3 w-3 mr-1" />
                  {user?.role ?? "user"}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">
                  {user?.loginMethod ?? "oauth"}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Joined: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Last sign in: {user?.lastSignedIn ? new Date(user.lastSignedIn).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-brand" />
            {t("profile.preferences")}
          </CardTitle>
          <CardDescription>{t("profile.preferencesDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-brand" />
            {t("profile.notifications")}
          </CardTitle>
          <CardDescription>{t("profile.notificationsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Email Notifications", desc: "Receive alerts and reports via email", value: emailNotifications, onChange: setEmailNotif },
            { label: "Push Notifications",  desc: "In-app notifications for real-time alerts", value: pushNotifications, onChange: setPushNotif },
            { label: "Weekly Report Email", desc: "Get a weekly performance summary every Monday", value: weeklyReport, onChange: setWeeklyReport },
          ].map(({ label, desc, value, onChange }) => (
            <div key={label} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch checked={value} onCheckedChange={onChange} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Alert Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-brand" />
            Alert Thresholds
          </CardTitle>
          <CardDescription>Get notified when metrics drop below these values.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Min CTR (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={alertThresholdCtr}
                onChange={(e) => setAlertCtr(e.target.value)}
                placeholder="e.g. 1.0"
              />
              <p className="text-xs text-muted-foreground">Alert when CTR falls below this</p>
            </div>
            <div className="space-y-2">
              <Label>Max CPC ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={alertThresholdCpc}
                onChange={(e) => setAlertCpc(e.target.value)}
                placeholder="e.g. 2.00"
              />
              <p className="text-xs text-muted-foreground">Alert when CPC exceeds this</p>
            </div>
            <div className="space-y-2">
              <Label>Budget Warning (%)</Label>
              <Input
                type="number"
                step="5"
                min="50"
                max="100"
                value={alertThresholdSpend}
                onChange={(e) => setAlertSpend(e.target.value)}
                placeholder="e.g. 80"
              />
              <p className="text-xs text-muted-foreground">Alert when budget usage exceeds this</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2 min-w-36">
          {isSaving ? (
            <><Loader2 className="h-4 w-4 animate-spin" />{t("common.saving")}</>
          ) : (
            <><Save className="h-4 w-4" />{t("common.saveChanges")}</>
          )}
        </Button>
      </div>
      </div>
    </DashboardLayout>
  );
}
