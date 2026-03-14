/**
 * workspace-tabs/GeneralTab.tsx — Workspace name, logo, plan, and danger zone.
 */
import { useState } from "react";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import {
  Building2, Trash2, ChevronDown, Save, AlertTriangle,
  Upload, ImageIcon,
} from "lucide-react";

export function GeneralTab() {
  const { activeWorkspace, refetch, canAdmin } = useWorkspace();
  const [name, setName] = useState(activeWorkspace?.name ?? "");
  const [showDanger, setShowDanger] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(activeWorkspace?.logo_url ?? null);
  const [logoUploading, setLogoUploading] = useState(false);

  const uploadLogoMutation = trpc.workspaces.uploadLogo.useMutation({
    onSuccess: (data) => {
      setLogoPreview(data.url);
      toast.success("Logo updated!");
      refetch();
    },
    onError: (e) => toast.error(e.message),
    onSettled: () => setLogoUploading(false),
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeWorkspace) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setLogoPreview(dataUrl);
      setLogoUploading(true);
      uploadLogoMutation.mutate({
        workspaceId: activeWorkspace.id,
        dataUrl,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const updateMutation = trpc.workspaces.update.useMutation({
    onSuccess: () => { toast.success("Workspace updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.workspaces.delete.useMutation({
    onSuccess: () => { toast.success("Workspace deleted"); refetch(); window.location.href = "/"; },
    onError: (e) => toast.error(e.message),
  });

  if (!activeWorkspace) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>No workspace selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Logo Upload */}
      {canAdmin && (
        <div className="glass rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-brand" />
            Workspace Logo
          </h3>
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center overflow-hidden border-2 border-border/40">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-7 h-7 text-brand/50" />
              )}
              {logoUploading && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand/10 text-brand text-xs font-medium cursor-pointer hover:bg-brand/20 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                {logoUploading ? "Uploading..." : "Upload Logo"}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} disabled={logoUploading} />
              </label>
              <p className="text-[11px] text-muted-foreground/60">PNG, JPG, SVG - Max 2MB</p>
            </div>
            {logoPreview && activeWorkspace?.logo_url && (
              <button
                onClick={() => {
                  setLogoPreview(null);
                  uploadLogoMutation.mutate({ workspaceId: activeWorkspace.id, dataUrl: "", mimeType: "image/png" });
                }}
                className="ml-auto text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )}

      {/* Workspace Info */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold">Workspace Information</h3>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Workspace Name</label>
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            placeholder="My Workspace"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Slug</label>
          <input value={activeWorkspace.slug} disabled
            className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border/40 text-sm text-muted-foreground cursor-not-allowed"
          />
          <p className="text-[11px] text-muted-foreground/60">Slug cannot be changed after creation.</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Plan</label>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${
              activeWorkspace.plan === "free" ? "bg-muted text-muted-foreground" :
              activeWorkspace.plan === "pro" ? "bg-brand/10 text-brand" :
              "bg-brand/10 text-brand"
            }`}>
              {activeWorkspace.plan}
            </span>
            <span className="text-xs text-muted-foreground">Your current plan</span>
          </div>
        </div>
        <button
          onClick={() => updateMutation.mutate({ workspaceId: activeWorkspace.id, name })}
          disabled={updateMutation.isPending || name === activeWorkspace.name}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Save className="w-3.5 h-3.5" />
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Danger Zone */}
      {activeWorkspace.role === "owner" && (
        <div className="glass rounded-2xl p-5 border border-destructive/20">
          <button onClick={() => setShowDanger((s) => !s)}
            className="w-full flex items-center justify-between text-sm font-semibold text-destructive"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Danger Zone
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showDanger ? "rotate-180" : ""}`} />
          </button>
          {showDanger && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Deleting this workspace is permanent and cannot be undone. All campaigns, posts, and data will be lost.
              </p>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">
                  Type <span className="font-bold text-foreground">{activeWorkspace.name}</span> to confirm
                </label>
                <input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-destructive/30 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30"
                  placeholder={activeWorkspace.name}
                />
              </div>
              <button
                onClick={() => deleteMutation.mutate({ workspaceId: activeWorkspace.id })}
                disabled={deleteConfirm !== activeWorkspace.name || deleteMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleteMutation.isPending ? "Deleting..." : "Delete Workspace"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
