/**
 * RecentCreationsWidget — Mini-gallery of recently AI-generated images/videos.
 */
import { ImageIcon, Play } from "lucide-react";

// Placeholder items — will be replaced with real data from tRPC
const PLACEHOLDER_ITEMS = [
  { id: 1, type: "image" as const, label: "Summer Sale Banner" },
  { id: 2, type: "image" as const, label: "Product Showcase" },
  { id: 3, type: "video" as const, label: "Brand Intro Reel" },
  { id: 4, type: "image" as const, label: "Social Post Visual" },
];

export function RecentCreationsWidget() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <ImageIcon className="w-4 h-4 text-pink-400" />
        <h2 className="text-sm font-semibold text-foreground">Recent Creations</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {PLACEHOLDER_ITEMS.map((item) => (
          <div
            key={item.id}
            className="group relative aspect-[4/3] rounded-lg bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.04] overflow-hidden hover:border-white/[0.08] transition-all cursor-pointer"
          >
            {/* Placeholder gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-indigo-500/5" />

            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              {item.type === "video" ? (
                <div className="w-10 h-10 rounded-full bg-white/[0.08] flex items-center justify-center group-hover:bg-white/[0.12] transition-colors">
                  <Play className="w-4 h-4 text-muted-foreground ml-0.5" />
                </div>
              ) : (
                <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
              )}
            </div>

            {/* Label overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/40 to-transparent">
              <span className="text-[11px] text-white/70 font-medium">{item.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
