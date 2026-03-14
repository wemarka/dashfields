/**
 * Profile.tsx — Account tab inside the Light Settings Modal.
 * Matches Manus reference: white bg, user avatar + name + email at top,
 * then plan/credits card, then preferences below.
 */
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/core/lib/trpc";
import { useAuth } from "@/shared/hooks/useAuth";
import { Switch } from "@/core/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { Loader2, Camera, Edit2, Check, X, UserCog } from "lucide-react";
import { Input } from "@/core/components/ui/input";
import { toast } from "sonner";

const TIMEZONES = [
  "UTC", "America/New_York", "America/Los_Angeles", "America/Chicago",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Dubai",
  "Asia/Riyadh", "Asia/Amman", "Asia/Beirut", "Asia/Cairo",
  "Asia/Tokyo", "Asia/Singapore", "Australia/Sydney",
];

export default function Profile() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: settings, isLoading } = trpc.settings.get.useQuery();

  const [timezone, setTimezone]             = useState("UTC");
  const [language, setLanguage]             = useState("en");
  const [emailNotifications, setEmailNotif] = useState(true);
  const [pushNotifications, setPushNotif]   = useState(false);
  const [weeklyReport, setWeeklyReport]     = useState(false);

  const [avatarUrl, setAvatarUrl]                 = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isEditingName, setIsEditingName]         = useState(false);
  const [displayName, setDisplayName]             = useState("");
  const [isSavingName, setIsSavingName]           = useState(false);

  useEffect(() => {
    if (!settings) return;
    if (settings.timezone)                        setTimezone(settings.timezone);
    if (settings.language)                        setLanguage(settings.language);
    if (settings.email_notifications !== undefined) setEmailNotif(settings.email_notifications);
    if (settings.push_notifications  !== undefined) setPushNotif(settings.push_notifications);
    if (settings.weekly_report        !== undefined) setWeeklyReport(settings.weekly_report);
  }, [settings]);

  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
  }, [user?.name]);

  const uploadAvatarMutation = trpc.settings.uploadAvatar.useMutation({
    onSuccess: (data) => {
      setAvatarUrl(data.url);
      utils.auth.me.invalidate();
      toast.success("Avatar updated");
    },
    onError: (e) => toast.error("Upload failed: " + e.message),
  });

  const updateProfileMutation = trpc.settings.updateProfile.useMutation({
    onSuccess: () => {
      setIsEditingName(false);
      setIsSavingName(false);
      utils.auth.me.invalidate();
      toast.success("Name saved");
    },
    onError: (e) => { setIsSavingName(false); toast.error("Failed: " + e.message); },
  });

  const updateSettings = trpc.settings.update.useMutation({
    onSuccess: () => toast.success("Preferences saved"),
    onError: (e) => toast.error("Failed: " + e.message),
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File too large (max 5MB)"); return; }
    setIsUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      await uploadAvatarMutation.mutateAsync({ base64, mimeType: file.type });
      setIsUploadingAvatar(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveName = () => {
    if (!displayName.trim()) return;
    setIsSavingName(true);
    updateProfileMutation.mutate({ name: displayName.trim() });
  };

  const handleSaveNotifications = () => {
    updateSettings.mutate({ emailNotifications, pushNotifications, weeklyReport });
  };

  const currentAvatarUrl = avatarUrl || (user as Record<string, unknown>)?.avatarUrl as string | undefined;
  const initials = (displayName || user?.name || "U").charAt(0).toUpperCase();

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="px-7 pt-6 pb-5" style={{ borderBottom: "1px solid #f0f0f0" }}>
        <h2 className="text-[17px] font-semibold text-white">Account</h2>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">

        {/* User row */}
        <div className="px-7 py-5 flex items-center gap-4">
          {/* Avatar */}
          <div className="relative group shrink-0">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold overflow-hidden"
              style={{ background: "linear-gradient(135deg, #ef3735, #c41a1a)" }}
            >
              {currentAvatarUrl ? (
                <img src={currentAvatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : initials}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            >
              {isUploadingAvatar
                ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                : <Camera className="w-4 h-4 text-white" />}
            </button>
            <div
              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#ef3735", border: "2px solid #433F3A" }}
            >
              <span className="text-white text-[10px] font-bold leading-none">+</span>
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* Name + email */}
          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <div className="flex items-center gap-2 mb-1">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-8 text-sm font-semibold max-w-[200px]"
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setIsEditingName(false); }}
                  autoFocus
                />
                <button onClick={handleSaveName} disabled={isSavingName} className="p-1 rounded text-foreground hover:text-muted-foreground transition-colors">
                  {isSavingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button onClick={() => { setIsEditingName(false); setDisplayName(user?.name ?? ""); }} className="p-1 rounded text-neutral-500 hover:text-neutral-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-[15px] text-white">{displayName || user?.name || "—"}</span>
                <button onClick={() => setIsEditingName(true)} className="p-1 rounded text-neutral-500 hover:text-neutral-400 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-[13px] text-neutral-500">{user?.email ?? "—"}</p>
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              title="Account settings"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800"
            >
              <UserCog className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Preferences ── */}
        <div className="px-7 pb-5" style={{ borderTop: "1px solid #f0f0f0" }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mt-5 mb-3 text-neutral-500">Preferences</p>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-9 rounded-lg animate-pulse bg-neutral-800" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[12px] mb-1.5 text-neutral-400">Timezone</p>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="w-full h-9 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-[12px] mb-1.5 text-neutral-400">Language</p>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-full h-9 text-[13px]">
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
        </div>

        {/* ── Notifications ── */}
        <div className="px-7 pb-6" style={{ borderTop: "1px solid #f0f0f0" }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mt-5 mb-3 text-neutral-500">Communication preferences</p>

          <div className="space-y-4">
            {[
              { label: "Receive product updates",           desc: "Receive early access to feature releases and success stories.",  value: emailNotifications, onChange: setEmailNotif },
              { label: "Email me when my queued task starts", desc: "We'll send a timely email once your task finishes queuing.",    value: pushNotifications,  onChange: setPushNotif },
              { label: "Weekly performance report",         desc: "Get a weekly summary of all platforms every Monday.",            value: weeklyReport,       onChange: setWeeklyReport },
            ].map(({ label, desc, value, onChange }) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[13px] font-semibold text-white">{label}</p>
                  <p className="text-[12px] mt-0.5 leading-snug text-neutral-500">{desc}</p>
                </div>
                <Switch checked={value} onCheckedChange={(v) => onChange(v)} className="shrink-0" />
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveNotifications}
            disabled={updateSettings.isPending}
            className="mt-5 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
          >
            {updateSettings.isPending ? "Saving..." : "Save preferences"}
          </button>
        </div>

      </div>
    </div>
  );
}
