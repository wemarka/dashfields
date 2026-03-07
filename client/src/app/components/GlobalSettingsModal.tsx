/**
 * GlobalSettingsModal — Custom portal overlay matching Manus settings design.
 *
 * Layout (reference images):
 *   - Dark overlay backdrop
 *   - Rounded modal: ~920px wide, ~600px tall
 *   - LEFT sidebar: ~220px, dark bg (#1a1a1a), logo at top, nav items, "Get help" at bottom
 *   - RIGHT content: flex-1, slightly lighter dark bg, title at top, scrollable content
 *   - X close button top-right
 *
 * NO shadcn Dialog used — pure custom portal for full layout control.
 */
import { useState, useEffect, useCallback, lazy, Suspense, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Loader2,
  User,
  Settings2,
  CreditCard,
  Link2,
  Plug,
  HelpCircle,
  ExternalLink,
  Building2,
  LogOut,
  X,
} from "lucide-react";
import { useAuth } from "@/shared/hooks/useAuth";
import { toast } from "sonner";

// ─── Lazy-load heavy tab content ──────────────────────────────────────────────
const ProfileContent     = lazy(() => import("@/app/features/settings/Profile"));
const SettingsContent    = lazy(() => import("@/app/features/settings/Settings"));
const BillingContent     = lazy(() => import("@/app/features/billing/BillingPage").then(m => ({ default: m.BillingPage })));
const ConnectionsContent = lazy(() => import("@/app/features/connections/Connections"));
const WorkspaceContent   = lazy(() => import("@/app/features/settings/WorkspaceSettings"));

// ─── Tab definitions ──────────────────────────────────────────────────────────
type TabId = "account" | "workspace" | "settings" | "billing" | "connections" | "integrations";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "account",      label: "Account",           icon: User },
  { id: "workspace",    label: "Workspace & Team",  icon: Building2 },
  { id: "settings",     label: "Settings",          icon: Settings2 },
  { id: "billing",      label: "Billing",           icon: CreditCard },
  { id: "connections",  label: "Connections",       icon: Link2 },
  { id: "integrations", label: "Integrations",      icon: Plug },
];

// ─── Tab content ──────────────────────────────────────────────────────────────
function TabContent({ activeTab }: { activeTab: TabId }) {
  const fallback = (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-5 h-5 animate-spin opacity-40" />
    </div>
  );

  return (
    <Suspense fallback={fallback}>
      {activeTab === "account"      && <ProfileContent />}
      {activeTab === "workspace"    && <WorkspaceContent />}
      {activeTab === "settings"     && <SettingsContent />}
      {activeTab === "billing"      && <BillingContent />}
      {activeTab === "connections"  && <ConnectionsContent />}
      {activeTab === "integrations" && <IntegrationsContent />}
    </Suspense>
  );
}

// ─── Integrations tab content ─────────────────────────────────────────────────
function IntegrationsContent() {
  const integrations = [
    { name: "Meta Ads Manager",  desc: "Automate ads insights and optimization",        color: "#0866FF", letter: "M" },
    { name: "TikTok Ads",        desc: "Manage TikTok campaigns and analytics",         color: "#010101", letter: "T" },
    { name: "Google Ads",        desc: "Track and optimize Google advertising spend",   color: "#4285F4", letter: "G" },
    { name: "LinkedIn Ads",      desc: "Run and analyze LinkedIn ad campaigns",         color: "#0077B5", letter: "L" },
    { name: "Snapchat Ads",      desc: "Manage Snap campaigns and audience insights",   color: "#FFFC00", letter: "S" },
    { name: "Pinterest Ads",     desc: "Track pins, boards, and Pinterest campaigns",   color: "#E60023", letter: "P" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-7 pt-6 pb-4 border-b border-white/8">
        <h2 className="text-[17px] font-semibold text-white">Integrations</h2>
        <p className="text-[13px] text-white/40 mt-0.5">Build workflows across your favorite apps</p>
      </div>
      <div className="flex-1 overflow-y-auto px-7 py-4">
        <div className="grid grid-cols-2 gap-3">
          {integrations.map((item) => (
            <button
              key={item.name}
              onClick={() => toast.info("Use the Connections tab to manage platform accounts")}
              className="flex items-start gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/8 border border-white/8 hover:border-white/15 transition-all text-left group"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold"
                style={{ backgroundColor: item.color, color: item.color === "#FFFC00" ? "#000" : "#fff" }}
              >
                {item.letter}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white/90">{item.name}</p>
                <p className="text-[12px] text-white/40 mt-0.5 leading-snug">{item.desc}</p>
                <p className="text-[12px] text-white/50 mt-2 group-hover:text-white/70 transition-colors">Go to configure &gt;</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
interface GlobalSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: TabId;
}

export function GlobalSettingsModal({ open, onOpenChange, initialTab = "account" }: GlobalSettingsModalProps) {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const modalRef = useRef<HTMLDivElement>(null);

  // Sync tab when modal opens
  useEffect(() => {
    if (open) setActiveTab(initialTab);
  }, [open, initialTab]);

  // Close on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  const handleSignOut = async () => {
    onOpenChange(false);
    await signOut();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onOpenChange(false);
  };

  if (!open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
      onClick={handleBackdropClick}
    >
      {/*
       * MODAL CONTAINER
       * Matches reference: ~920px wide, ~600px tall, dark rounded box
       * flex flex-row — sidebar on left, content on right
       */}
      <div
        ref={modalRef}
        className="relative flex flex-row rounded-2xl overflow-hidden shadow-2xl"
        style={{
          width: "min(920px, calc(100vw - 32px))",
          height: "min(620px, calc(100vh - 48px))",
          backgroundColor: "#1c1c1e",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Close button ── */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
          style={{ color: "rgba(255,255,255,0.4)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
        >
          <X className="w-4 h-4" />
        </button>

        {/* ────────────────────────────────────────────────────────────────
            LEFT SIDEBAR
            Reference: ~220px, dark bg, logo at top, nav list, get help at bottom
        ──────────────────────────────────────────────────────────────── */}
        <aside
          className="flex flex-col shrink-0 overflow-hidden"
          style={{
            width: 220,
            backgroundColor: "#161618",
            borderRight: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {/* Logo / Brand */}
          <div className="px-5 py-5 shrink-0">
            <div className="flex items-center gap-2.5">
              {/* Dashfields icon mark */}
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/dashfields-logo-full-white-cropped_9f9de9c4.png"
                alt="Dashfields"
                className="h-5 w-auto object-contain"
              />
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 px-2 py-1 overflow-y-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-left transition-all mb-0.5"
                  style={{
                    backgroundColor: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                    color: isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.5)",
                    fontWeight: isActive ? 500 : 400,
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(255,255,255,0.05)";
                      (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.8)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                      (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)";
                    }
                  }}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Bottom: Get help + Sign out */}
          <div className="px-2 py-3 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <button
              onClick={() => toast.info("Help center coming soon")}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-left transition-all mb-0.5"
              style={{ color: "rgba(255,255,255,0.4)" }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(255,255,255,0.05)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.4)";
              }}
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">Get help</span>
              <ExternalLink className="w-3 h-3 opacity-50" />
            </button>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-left transition-all"
              style={{ color: "rgba(239,68,68,0.8)" }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(239,68,68,0.1)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(239,68,68,1)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(239,68,68,0.8)";
              }}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {/* ────────────────────────────────────────────────────────────────
            RIGHT CONTENT AREA
            Reference: flex-1, slightly lighter dark, title at top, scrollable
        ──────────────────────────────────────────────────────────────── */}
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{ backgroundColor: "#1c1c1e" }}
        >
          {/* Tab content — each tab component handles its own header + scroll */}
          <div className="flex-1 overflow-y-auto">
            <TabContent activeTab={activeTab} />
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export type { TabId as SettingsTabId };
