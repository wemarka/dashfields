/**
 * GlobalSettingsModal — Manus-style two-pane settings modal.
 * Left: fixed sidebar with logo + nav items.
 * Right: content area that renders the active tab's component.
 *
 * Tabs: Account · Settings · Billing · Connections · Integrations · Brand Kit
 */
import { useState, useEffect, lazy, Suspense } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/core/components/ui/dialog";
import { Loader2, User, Settings2, CreditCard, Link2, Plug, Palette, HelpCircle, ExternalLink, ChevronRight } from "lucide-react";
import { useDarkMode } from "@/app/components/layout-parts";
import { toast } from "sonner";

// ─── Logo ─────────────────────────────────────────────────────────────────────
const LOGO_DARK  = "https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/dashfields-logo-full-white-cropped_9f9de9c4.png";
const LOGO_LIGHT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/dashfields-logo-full-cropped_e5f165fe.png";

// ─── Lazy-load heavy tab content ──────────────────────────────────────────────
const ProfileContent     = lazy(() => import("@/app/features/settings/Profile"));
const SettingsContent    = lazy(() => import("@/app/features/settings/Settings"));
const BillingContent     = lazy(() => import("@/app/features/billing/BillingPage").then(m => ({ default: m.BillingPage })));
const ConnectionsContent = lazy(() => import("@/app/features/connections/Connections"));

// ─── Tab definitions ──────────────────────────────────────────────────────────
type TabId = "account" | "settings" | "billing" | "connections" | "integrations" | "brand-kit";

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ElementType;
  description: string;
  available: boolean;
}

const TABS: TabDef[] = [
  {
    id: "account",
    label: "Account",
    icon: User,
    description: "Manage your profile, avatar, and preferences",
    available: true,
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings2,
    description: "App appearance, language, and notifications",
    available: true,
  },
  {
    id: "billing",
    label: "Billing",
    icon: CreditCard,
    description: "Plans, usage, and payment history",
    available: true,
  },
  {
    id: "connections",
    label: "Connections",
    icon: Link2,
    description: "Connected social media accounts",
    available: true,
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Plug,
    description: "Platform integrations and API connections",
    available: true,
  },
  {
    id: "brand-kit",
    label: "Brand Kit",
    icon: Palette,
    description: "Brand colors, fonts, and assets",
    available: false,
  },
];

// ─── Tab content loader ───────────────────────────────────────────────────────
function TabContent({ activeTab }: { activeTab: TabId }) {
  const fallback = (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <Suspense fallback={fallback}>
      {activeTab === "account"      && <ProfileContent />}
      {activeTab === "settings"     && <SettingsContent />}
      {activeTab === "billing"      && <BillingContent />}
      {activeTab === "connections"  && <ConnectionsContent />}
      {activeTab === "integrations" && <IntegrationsPlaceholder />}
      {activeTab === "brand-kit"    && <ComingSoonPlaceholder label="Brand Kit" />}
    </Suspense>
  );
}

// ─── Integrations placeholder (inline list, no nested modal) ─────────────────
function IntegrationsPlaceholder() {
  return (
    <div className="p-6 space-y-2">
      <h2 className="text-xl font-semibold text-foreground mb-1">Integrations</h2>
      <p className="text-sm text-muted-foreground mb-6">Connect external platforms and services to Dashfields.</p>
      {[
        { name: "Meta (Facebook & Instagram)", desc: "Facebook Pages, Instagram Business, and Ads Manager", color: "bg-blue-500" },
        { name: "TikTok", desc: "Publish short-form videos and manage TikTok Ads campaigns", color: "bg-black dark:bg-white/10" },
        { name: "X (Twitter)", desc: "Post tweets, manage Spaces, and run X Ads", color: "bg-black dark:bg-white/10" },
        { name: "LinkedIn", desc: "Manage company pages, publish posts, and run LinkedIn Ads", color: "bg-[#0077B5]" },
        { name: "YouTube", desc: "Track channel analytics, manage videos, and run YouTube Ads", color: "bg-red-600" },
        { name: "Snapchat", desc: "Run Snap Ads and analyze audience insights", color: "bg-yellow-400" },
        { name: "Pinterest", desc: "Manage pins, boards, and run Pinterest Ads", color: "bg-red-500" },
      ].map((item) => (
        <button
          key={item.name}
          onClick={() => toast.info("Use the Connections tab to manage platform accounts")}
          className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-muted/40 transition-colors text-left group border-b border-border/20 last:border-0"
        >
          <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center shrink-0`}>
            <Plug className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-foreground">{item.name}</p>
            <p className="text-sm text-muted-foreground">{item.desc}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground/80 group-hover:translate-x-0.5 transition-all" />
        </button>
      ))}
    </div>
  );
}

function ComingSoonPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Palette className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{label}</h3>
      <p className="text-sm text-muted-foreground">Coming soon — this feature is under development.</p>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
interface GlobalSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional: open directly to a specific tab */
  initialTab?: TabId;
}

export function GlobalSettingsModal({ open, onOpenChange, initialTab = "account" }: GlobalSettingsModalProps) {
  const { dark } = useDarkMode();
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  // Sync initialTab when modal opens
  useEffect(() => {
    if (open) setActiveTab(initialTab);
  }, [open, initialTab]);

  const activeTabDef = TABS.find(t => t.id === activeTab)!;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[960px] w-full p-0 gap-0 rounded-2xl border border-border/50 shadow-2xl overflow-hidden"
        style={{ minHeight: 560, maxHeight: "88vh" }}
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">Manage your account, settings, billing, and integrations.</DialogDescription>

        <div className="flex h-full overflow-hidden" style={{ minHeight: 560, maxHeight: "88vh" }}>

          {/* ── Left Sidebar ── */}
          <aside className="w-56 shrink-0 flex flex-col border-r border-border/20 bg-muted/20 overflow-hidden">
            {/* Logo */}
            <div className="px-5 py-5 border-b border-border/10 shrink-0">
              <img
                src={dark ? LOGO_DARK : LOGO_LIGHT}
                alt="Dashfields"
                className="h-6 w-auto object-contain"
              />
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (!tab.available) {
                        toast.info(`${tab.label} — coming soon`);
                        return;
                      }
                      setActiveTab(tab.id);
                    }}
                    className={[
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left",
                      isActive
                        ? "bg-background shadow-sm font-semibold text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/60",
                      !tab.available && "opacity-50 cursor-not-allowed",
                    ].filter(Boolean).join(" ")}
                  >
                    <Icon className={["w-4 h-4 shrink-0", isActive ? "text-primary" : ""].join(" ")} />
                    <span className="truncate">{tab.label}</span>
                    {!tab.available && (
                      <span className="ml-auto text-[10px] font-medium text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded-full">
                        Soon
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Get Help */}
            <div className="px-3 py-3 border-t border-border/10 shrink-0">
              <button
                onClick={() => toast.info("Help center coming soon")}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-background/60 transition-all text-left"
              >
                <HelpCircle className="w-4 h-4 shrink-0" />
                <span>Get help</span>
                <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
              </button>
            </div>
          </aside>

          {/* ── Right Content ── */}
          <div className="flex-1 flex flex-col overflow-hidden bg-background">
            {/* Content header */}
            <div className="px-8 pt-7 pb-0 shrink-0">
              <h2 className="text-xl font-semibold text-foreground">{activeTabDef.label}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{activeTabDef.description}</p>
              <div className="mt-5 border-b border-border/20" />
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              <TabContent activeTab={activeTab} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type { TabId as SettingsTabId };
