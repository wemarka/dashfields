/**
 * AssetsPage — Media library for uploaded and generated assets.
 * Placeholder — will be expanded with full asset management.
 */
import { FolderOpen, Upload, ImageIcon, FileVideo } from "lucide-react";
import { toast } from "sonner";

export default function AssetsPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Assets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your media library — images, videos, and brand assets.
          </p>
        </div>
        <button
          onClick={() => toast.info("Feature coming soon")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload
        </button>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02]">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 flex items-center justify-center mb-4">
          <FolderOpen className="w-7 h-7 text-violet-400" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">No assets yet</h3>
        <p className="text-xs text-muted-foreground max-w-sm text-center">
          Upload images and videos, or generate them with Dash Studios. All your creative assets will appear here.
        </p>
      </div>
    </div>
  );
}
