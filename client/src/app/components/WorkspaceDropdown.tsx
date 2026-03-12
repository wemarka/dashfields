/**
 * WorkspaceDropdown.tsx
 * Elegant inline dropdown for the sidebar workspace switcher.
 * Sections: active workspace header → all workspaces list → actions (Settings, Invite, Create)
 * "Create New Workspace" opens an inline form — no navigation required.
 */
import { useState, useRef, useEffect } from "react";
import { Settings, UserPlus, ChevronRight, Plus, Check, Loader2, X } from "lucide-react";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import type { WorkspaceItem } from "@/core/contexts/WorkspaceContext";
import { toast } from "sonner";

interface WorkspaceDropdownProps {
  activeWorkspace: WorkspaceItem | null;
  workspaces: WorkspaceItem[];
  user: { name?: string | null } | null;
  collapsed: boolean;
  onSelectWorkspace: (id: number) => void;
  onNavigate: (path: string) => void;
}

function WorkspaceAvatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const letter = name.charAt(0).toUpperCase();
  const dim = size === "md" ? "w-8 h-8 text-[14px]" : "w-7 h-7 text-[13px]";
  return (
    <div
      className={`shrink-0 ${dim} rounded-lg flex items-center justify-center font-bold text-white shadow-sm`}
      style={{ background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" }}
    >
      {letter}
    </div>
  );
}

// ─── Inline Create Form ───────────────────────────────────────────────────────
function CreateWorkspaceForm({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { refetch } = useWorkspace();

  const createMutation = trpc.workspaces.create.useMutation({
    onSuccess: (ws) => {
      toast.success(`"${ws.name}" workspace created`);
      refetch();
      onCreated(ws.id);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create workspace");
    },
  });

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Workspace name must be at least 2 characters");
      return;
    }
    createMutation.mutate({ name: trimmed });
  };

  return (
    <form onSubmit={handleSubmit} className="px-3 py-2.5 border-t border-border/40">
      <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-2">
        New Workspace
      </p>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Workspace name…"
          maxLength={64}
          disabled={createMutation.isPending}
          className="flex-1 min-w-0 text-[12.5px] bg-muted/50 border border-border/60 rounded-lg px-2.5 py-1.5
            text-foreground placeholder:text-muted-foreground/40 outline-none
            focus:ring-1 focus:ring-primary/40 focus:border-primary/50 transition-all"
        />
        <button
          type="submit"
          disabled={createMutation.isPending || name.trim().length < 2}
          className="shrink-0 w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center
            hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {createMutation.isPending
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Check className="w-3.5 h-3.5" />
          }
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={createMutation.isPending}
          className="shrink-0 w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60
            flex items-center justify-center transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
}

// ─── Main Dropdown ────────────────────────────────────────────────────────────
export function WorkspaceDropdown({
  activeWorkspace,
  workspaces,
  user,
  collapsed,
  onSelectWorkspace,
  onNavigate,
}: WorkspaceDropdownProps) {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const displayName = activeWorkspace?.name ?? user?.name ?? "Workspace";
  const plan = activeWorkspace?.plan ?? "free";

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showCreate) { setShowCreate(false); return; }
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, showCreate]);

  const handleCreated = (newId: number) => {
    onSelectWorkspace(newId);
    setShowCreate(false);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative px-2 pt-2 pb-1">
      {/* ── Trigger Button ── */}
      <button
        onClick={() => { setOpen((v) => !v); if (open) setShowCreate(false); }}
        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all duration-200
          hover:bg-foreground/[0.05] active:scale-[0.98] group
          ${collapsed ? "justify-center" : ""}
          ${open ? "bg-foreground/[0.05]" : ""}
        `}
        title={collapsed ? displayName : undefined}
      >
        <WorkspaceAvatar name={displayName} />
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
                {displayName}
              </p>
              <p className="text-[10px] text-muted-foreground/60 truncate leading-tight capitalize">
                {plan}
              </p>
            </div>
            <svg
              className={`w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-all duration-200 shrink-0 ${open ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 16 16"
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        )}
      </button>

      {/* ── Dropdown Panel ── */}
      {open && (
        <div
          className="absolute left-2 right-2 top-full mt-1 z-50 rounded-xl border border-border/60 bg-background shadow-lg shadow-black/10 overflow-hidden"
          style={{ animation: "fadeInDown 120ms ease" }}
        >
          {/* Active workspace header */}
          <div className="px-3 py-2.5 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <WorkspaceAvatar name={displayName} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground truncate">{displayName}</p>
                <p className="text-[10px] text-muted-foreground/50 capitalize">{plan} plan</p>
              </div>
            </div>
          </div>

          {/* All Workspaces list */}
          {workspaces.length > 0 && (
            <div className="py-1 border-b border-border/40">
              <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
                All Workspaces
              </p>
              <div className="max-h-36 overflow-y-auto">
                {workspaces.map((ws) => {
                  const isActive = ws.id === activeWorkspace?.id;
                  return (
                    <button
                      key={ws.id}
                      onClick={() => { onSelectWorkspace(ws.id); setOpen(false); setShowCreate(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-150
                        ${isActive ? "bg-foreground/[0.04]" : "hover:bg-foreground/[0.04]"}
                      `}
                    >
                      <WorkspaceAvatar name={ws.name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-medium text-foreground truncate">{ws.name}</p>
                        <p className="text-[10px] text-muted-foreground/50 capitalize">{ws.plan}</p>
                      </div>
                      {isActive && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action items */}
          {!showCreate && (
            <div className="py-1">
              <ActionItem
                icon={<Settings className="w-3.5 h-3.5" />}
                label="Workspace Settings"
                onClick={() => { onNavigate("/settings/workspace"); setOpen(false); }}
              />
              <ActionItem
                icon={<UserPlus className="w-3.5 h-3.5" />}
                label="Invite Member"
                onClick={() => { onNavigate("/settings/workspace?tab=members"); setOpen(false); }}
              />
            </div>
          )}

          {/* Create new workspace — inline form or trigger button */}
          {showCreate ? (
            <CreateWorkspaceForm
              onClose={() => setShowCreate(false)}
              onCreated={handleCreated}
            />
          ) : (
            <div className="border-t border-border/40 py-1">
              <ActionItem
                icon={<Plus className="w-3.5 h-3.5" />}
                label="Create New Workspace"
                onClick={() => setShowCreate(true)}
                accent
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Action Item ─────────────────────────────────────────────────────────────
function ActionItem({
  icon,
  label,
  onClick,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-150 group
        ${accent
          ? "text-primary hover:bg-primary/[0.06]"
          : "text-foreground/80 hover:bg-foreground/[0.04] hover:text-foreground"
        }
      `}
    >
      <span className={`shrink-0 ${accent ? "text-primary" : "text-muted-foreground/60 group-hover:text-foreground/70"} transition-colors`}>
        {icon}
      </span>
      <span className="text-[12.5px] font-medium">{label}</span>
      <ChevronRight className="w-3 h-3 ml-auto text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
    </button>
  );
}
