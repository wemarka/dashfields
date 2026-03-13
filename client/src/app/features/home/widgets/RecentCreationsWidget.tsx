/**
 * RecentCreationsWidget — Mini-gallery of recently AI-generated images/videos.
 * Connected to real data via tRPC homeStats.recentCreations.
 */
import { ImageIcon, Play, Sparkles } from "lucide-react";
import { trpc } from "@/core/lib/trpc";

export function RecentCreationsWidget() {
  const { data: creations, isLoading } = trpc.homeStats.recentCreations.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const hasCreations = creations && creations.length > 0;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <ImageIcon className="w-4 h-4 text-pink-400" />
        <h2 className="text-sm font-semibold text-foreground">Recent Creations</h2>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[4/3] rounded-lg bg-white/[0.03] border border-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : hasCreations ? (
        <div className="grid grid-cols-2 gap-3">
          {creations.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="group relative aspect-[4/3] rounded-lg overflow-hidden border border-white/[0.04] hover:border-white/[0.08] transition-all cursor-pointer"
            >
              {item.url ? (
                <img
                  src={item.url}
                  alt={item.label}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-indigo-500/5" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {item.type === "video" ? (
                      <div className="w-10 h-10 rounded-full bg-white/[0.08] flex items-center justify-center group-hover:bg-white/[0.12] transition-colors">
                        <Play className="w-4 h-4 text-muted-foreground ml-0.5" />
                      </div>
                    ) : (
                      <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                    )}
                  </div>
                </>
              )}

              {/* Label overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                <span className="text-[11px] text-white/80 font-medium line-clamp-1">{item.label}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center mb-3">
            <Sparkles className="w-5 h-5 text-violet-400" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">No creations yet</p>
          <p className="text-xs text-muted-foreground/60">
            Use the AI Assist to generate campaign visuals
          </p>
        </div>
      )}
    </div>
  );
}
