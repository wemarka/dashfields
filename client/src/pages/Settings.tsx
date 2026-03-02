import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { Facebook, Instagram, Bell, Shield, Palette, ChevronRight, Check } from "lucide-react";

const sections = [
  { id: "account",       icon: Shield,   label: "Account" },
  { id: "integrations",  icon: Facebook, label: "Integrations" },
  { id: "notifications", icon: Bell,     label: "Notifications" },
  { id: "appearance",    icon: Palette,  label: "Appearance" },
];

export default function Settings() {
  const { user } = useAuth();
  const [active, setActive] = useState("account");
  const [metaConnected, setMetaConnected] = useState(false);
  const [igConnected, setIgConnected] = useState(false);

  return (
    <DashboardLayout>
      <div className="p-6 animate-fade-in">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your account and integrations</p>
        </div>

        <div className="flex gap-5">
          {/* Sidebar */}
          <div className="glass rounded-2xl p-2 w-48 shrink-0 h-fit space-y-0.5">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={"w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left " + (active === s.id ? "bg-foreground/10 text-foreground" : "text-foreground/60 hover:text-foreground hover:bg-foreground/5")}
              >
                <s.icon className="w-4 h-4 shrink-0" />
                {s.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-4">
            {active === "account" && (
              <div className="glass rounded-2xl p-6 space-y-5">
                <h2 className="text-sm font-semibold">Account Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Name</label>
                    <input
                      defaultValue={user?.name ?? ""}
                      className="w-full px-3 py-2 rounded-xl bg-foreground/5 text-sm outline-none focus:ring-2 focus:ring-foreground/15"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
                    <input
                      defaultValue={user?.email ?? ""}
                      disabled
                      className="w-full px-3 py-2 rounded-xl bg-foreground/3 text-sm text-muted-foreground outline-none"
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <button className="px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors">
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {active === "integrations" && (
              <div className="space-y-3">
                {/* Meta */}
                <div className="glass rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Facebook className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Meta Ads</p>
                        <p className="text-xs text-muted-foreground">Connect your Meta Ads account</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setMetaConnected(!metaConnected)}
                      className={"flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors " + (metaConnected ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-foreground text-background hover:bg-foreground/90")}
                    >
                      {metaConnected && <Check className="w-3.5 h-3.5" />}
                      {metaConnected ? "Connected" : "Connect"}
                    </button>
                  </div>
                  {metaConnected && (
                    <div className="mt-4 pt-4 border-t border-foreground/5 grid grid-cols-3 gap-3">
                      {[
                        { label: "Ad Account", value: "act_123456789" },
                        { label: "Business", value: "My Business" },
                        { label: "Permissions", value: "Full Access" },
                      ].map((f) => (
                        <div key={f.label}>
                          <p className="text-xs text-muted-foreground">{f.label}</p>
                          <p className="text-sm font-medium mt-0.5">{f.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Instagram */}
                <div className="glass rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center">
                        <Instagram className="w-5 h-5 text-pink-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Instagram</p>
                        <p className="text-xs text-muted-foreground">Connect your Instagram Business account</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIgConnected(!igConnected)}
                      className={"flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors " + (igConnected ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-foreground text-background hover:bg-foreground/90")}
                    >
                      {igConnected && <Check className="w-3.5 h-3.5" />}
                      {igConnected ? "Connected" : "Connect"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {active === "notifications" && (
              <div className="glass rounded-2xl p-6 space-y-4">
                <h2 className="text-sm font-semibold">Notification Preferences</h2>
                {[
                  { label: "Campaign performance alerts",  desc: "Get notified when ROAS drops below threshold" },
                  { label: "Budget warnings",               desc: "Alert when daily budget is 80% consumed" },
                  { label: "New insights available",        desc: "Weekly AI-powered recommendations" },
                  { label: "Scheduled post reminders",      desc: "Reminder 1 hour before scheduled posts" },
                ].map((n, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-foreground/5 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{n.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.desc}</p>
                    </div>
                    <button className="w-10 h-6 rounded-full bg-foreground/15 relative transition-colors hover:bg-foreground/25">
                      <span className="absolute left-1 top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {active === "appearance" && (
              <div className="glass rounded-2xl p-6 space-y-4">
                <h2 className="text-sm font-semibold">Appearance</h2>
                <div>
                  <p className="text-xs text-muted-foreground mb-3">Theme</p>
                  <div className="flex gap-3">
                    {["Light", "Dark", "System"].map((t) => (
                      <button
                        key={t}
                        className={"px-4 py-2 rounded-xl text-sm font-medium border transition-all " + (t === "Light" ? "border-foreground/30 bg-foreground/5" : "border-foreground/10 text-muted-foreground hover:border-foreground/20")}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-3">Language</p>
                  <select className="px-3 py-2 rounded-xl bg-foreground/5 text-sm outline-none focus:ring-2 focus:ring-foreground/15">
                    <option>English</option>
                    <option>Arabic</option>
                    <option>French</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
