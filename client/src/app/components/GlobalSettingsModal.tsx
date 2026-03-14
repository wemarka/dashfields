/**
 * GlobalSettingsModal — Light theme custom portal overlay.
 *
 * Layout:
 *   - Light overlay backdrop (rgba(0,0,0,0.4))
 *   - Rounded modal: ~920px wide, ~620px tall
 *   - LEFT sidebar: ~220px, light gray bg (#f5f5f7), logo at top, nav items, "Get help" + Sign out at bottom
 *   - RIGHT content: flex-1, white bg (#ffffff), title at top, scrollable content
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
  { id: "account",      label: "Account",          icon: User },
  { id: "workspace",    label: "Workspace & Team", icon: Building2 },
  { id: "settings",     label: "Settings",         icon: Settings2 },
  { id: "billing",      label: "Billing",          icon: CreditCard },
  { id: "connections",  label: "Connections",      icon: Link2 },
  { id: "integrations", label: "Integrations",     icon: Plug },
];

// ─── Tab content ──────────────────────────────────────────────────────────────
function TabContent({ activeTab }: { activeTab: TabId }) {
  const fallback = (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
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
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-7 pt-6 pb-4" style={{ borderBottom: "1px solid #f0f0f0" }}>
        <h2 className="text-[17px] font-semibold text-white">Integrations</h2>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-7 py-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-neutral-800 flex items-center justify-center mb-4">
          <Plug className="w-6 h-6 text-neutral-500" />
        </div>
        <h3 className="text-[15px] font-semibold text-white mb-1">Coming Soon</h3>
        <p className="text-[13px] text-neutral-500 max-w-[220px] leading-relaxed">
          Integrations with your favorite apps are on the way.
        </p>
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
  useAuth();
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
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onOpenChange(false);
  };

  if (!open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={handleBackdropClick}
    >
      {/*
       * MODAL CONTAINER — Light theme
       * ~920px wide, ~620px tall, white rounded box with subtle shadow
       */}
      <div
        ref={modalRef}
        className="relative flex flex-row rounded-2xl overflow-hidden"
        style={{
          width: "min(920px, calc(100vw - 32px))",
          height: "min(640px, calc(100vh - 48px))",
          backgroundColor: "#ffffff",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Close button ── */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
          style={{ color: "#9ca3af" }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#374151"; (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f3f4f6"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#9ca3af"; (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* ────────────────────────────────────────────────────────────────
            LEFT SIDEBAR — Light gray
            Reference: ~220px, light gray bg, logo at top, nav list, get help + sign out at bottom
        ──────────────────────────────────────────────────────────────── */}
        <aside
          className="flex flex-col shrink-0 overflow-hidden"
          style={{
            width: 220,
            backgroundColor: "#f7f7f8",
            borderRight: "1px solid #ebebeb",
          }}
        >
          {/* Logo */}
          <div className="px-5 py-5 shrink-0">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/Dashfileds_ICON_SVG_b923b2b0.svg"
              alt="Dashfields"
              className="h-5 w-auto object-contain"
              style={{ filter: "invert(1) brightness(0)" }}
            />
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
                    backgroundColor: isActive ? "#e8e8ea" : "transparent",
                    color: isActive ? "#1c1c1c" : "#6b7280",
                    fontWeight: isActive ? 500 : 400,
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#ededef";
                      (e.currentTarget as HTMLButtonElement).style.color = "#374151";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                      (e.currentTarget as HTMLButtonElement).style.color = "#6b7280";
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
          <div className="px-2 py-3 shrink-0" style={{ borderTop: "1px solid #ebebeb" }}>
            <button
              onClick={() => toast.info("Help center coming soon")}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-left transition-all mb-0.5"
              style={{ color: "#6b7280" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#ededef"; (e.currentTarget as HTMLButtonElement).style.color = "#374151"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#6b7280"; }}
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">Get help</span>
              <ExternalLink className="w-3 h-3 opacity-50" />
            </button>


          </div>
        </aside>

        {/* ────────────────────────────────────────────────────────────────
            RIGHT CONTENT AREA — White
        ──────────────────────────────────────────────────────────────── */}
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{ backgroundColor: "#ffffff" }}
        >
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
