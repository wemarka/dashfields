/**
 * Profile.tsx — Account tab inside the dark Settings Modal.
 * Matches Manus reference: dark bg, user avatar + name + email at top,
 * then plan/credits card, then preferences below.
 */
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/core/lib/trpc";
import { useAuth } from "@/shared/hooks/useAuth";
import { Switch } from "@/core/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { Loader2, Camera, Edit2, Check, X, UserCog, LogOut as LogOutIcon } from "lucide-react";
import { Input } from "@/core/components/ui/input";
import { toast } from "sonner";

const TIMEZONES = [
  "UTC", "America/New_York", "America/Los_Angeles", "America/Chicago",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Dubai",
  "Asia/Riyadh", "Asia/Amman", "Asia/Beirut", "Asia/Cairo",
  "Asia/Tokyo", "Asia/Singapore", "Australia/Sydney",
];

// ─── Inline style helpers for dark modal ─────────────────────────────────────
const S = {
  section: "px-7 py-5" as const,
  divider: { borderTop: "1px solid rgba(255,255,255,0.07)" } as React.CSSProperties,
  label: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 6 },
  value: { color: "rgba(255,255,255,0.85)", fontSize: 14 },
  muted: { color: "rgba(255,255,255,0.4)", fontSize: 13 },
  card: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", padding: "16px 20px" } as React.CSSProperties,
};

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
  }, [settings]);

  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
  }, [user]);

  const updateSettings = trpc.settings.update.useMutation({
    onSuccess: () => { utils.settings.get.invalidate(); toast.success("Saved"); },
    onError: (err) => toast.error(err.message),
  });

  const updateProfileMutation = trpc.settings.updateProfile.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      toast.success("Name updated");
      setIsEditingName(false);
      setIsSavingName(false);
    },
    onError: (err) => { toast.error(err.message); setIsSavingName(false); },
  });

  const uploadAvatarMutation = trpc.settings.uploadAvatar.useMutation({
    onSuccess: (data) => {
      setAvatarUrl((data as Record<string, unknown>).avatarUrl as string);
      utils.auth.me.invalidate();
      toast.success("Avatar updated");
      setIsUploadingAvatar(false);
    },
    onError: (err) => { toast.error(err.message); setIsUploadingAvatar(false); },
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setIsUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      uploadAvatarMutation.mutate({ base64, mimeType: file.type });
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
      <div className="px-7 pt-6 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <h2 className="text-[17px] font-semibold" style={{ color: "rgba(255,255,255,0.95)" }}>Account</h2>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">

        {/* User row */}
        <div className="px-7 py-5 flex items-center gap-4">
          {/* Avatar */}
          <div className="relative group shrink-0">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold overflow-hidden"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              {currentAvatarUrl ? (
                <img src={currentAvatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : initials}
            </div>
            {/* Upload overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
            >
              {isUploadingAvatar
                ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                : <Camera className="w-4 h-4 text-white" />}
            </button>
            {/* Plus badge */}
            <div
              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#3b82f6", border: "2px solid #1c1c1e" }}
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
                  className="h-8 text-sm font-semibold max-w-[200px] bg-white/10 border-white/20 text-white"
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setIsEditingName(false); }}
                  autoFocus
                />
                <button onClick={handleSaveName} disabled={isSavingName} className="p-1 rounded text-emerald-400 hover:text-emerald-300 transition-colors">
                  {isSavingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button onClick={() => { setIsEditingName(false); setDisplayName(user?.name ?? ""); }} className="p-1 rounded transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-[15px]" style={{ color: "rgba(255,255,255,0.9)" }}>
                  {displayName || user?.name || "—"}
                </span>
                <button onClick={() => setIsEditingName(true)} className="p-1 rounded transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }}>{user?.email ?? "—"}</p>
          </div>

          {/* Action icons (role + logout placeholder) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              title="Account settings"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
            >
              <UserCog className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Preferences ── */}
        <div className="px-7 pb-5" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mt-5 mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>Preferences</p>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-9 rounded-lg animate-pulse" style={{ backgroundColor: "rgba(255,255,255,0.05)" }} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[12px] mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Timezone</p>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="w-full h-9 text-[13px] bg-white/8 border-white/10 text-white/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-[12px] mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Language</p>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-full h-9 text-[13px] bg-white/8 border-white/10 text-white/80">
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
        <div className="px-7 pb-6" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mt-5 mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>Communication preferences</p>

          <div className="space-y-4">
            {[
              { label: "Receive product updates", desc: "Receive early access to feature releases and success stories.", value: emailNotifications, onChange: setEmailNotif },
              { label: "Email me when my queued task starts", desc: "We'll send a timely email once your task finishes queuing.", value: pushNotifications, onChange: setPushNotif },
              { label: "Weekly performance report", desc: "Get a weekly summary of all platforms every Monday.", value: weeklyReport, onChange: setWeeklyReport },
            ].map(({ label, desc, value, onChange }) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>{label}</p>
                  <p className="text-[12px] mt-0.5 leading-snug" style={{ color: "rgba(255,255,255,0.35)" }}>{desc}</p>
                </div>
                <Switch
                  checked={value}
                  onCheckedChange={(v) => { onChange(v); }}
                  className="shrink-0"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveNotifications}
            disabled={updateSettings.isPending}
            className="mt-5 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
            style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.15)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)")}
          >
            {updateSettings.isPending ? "Saving..." : "Save preferences"}
          </button>
        </div>

      </div>
    </div>
  );
}
