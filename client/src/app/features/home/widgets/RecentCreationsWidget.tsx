/**
 * RecentCreationsWidget — Mini-gallery of recently AI-generated images/videos.
 * Connected to real data via tRPC homeStats.recentCreations.
 * Uses neutral palette with brand-red accent.
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
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="flex items-center gap-2 mb-4">
        <ImageIcon className="w-4 h-4 text-brand" />
        <h2 className="text-sm font-semibold text-white">Recent Creations</h2>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[4/3] rounded-lg bg-neutral-800 border border-neutral-700 animate-pulse" />
          ))}
        </div>
      ) : hasCreations ? (
        <div className="grid grid-cols-2 gap-3">
          {creations.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="group relative aspect-[4/3] rounded-lg overflow-hidden border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer"
            >
              {item.url ? (
                <img
                  src={item.url}
                  alt={item.label}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <>
                  <div className="absolute inset-0 bg-neutral-800/50" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {item.type === "video" ? (
                      <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center group-hover:bg-neutral-600 transition-colors">
                        <Play className="w-4 h-4 text-neutral-300 ml-0.5" />
                      </div>
                    ) : (
                      <ImageIcon className="w-6 h-6 text-neutral-600" />
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
          <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center mb-3">
            <Sparkles className="w-5 h-5 text-brand" />
          </div>
          <p className="text-sm text-neutral-400 mb-1">No creations yet</p>
          <p className="text-xs text-neutral-500">
            Use the AI Assist to generate campaign visuals
          </p>
        </div>
      )}
    </div>
  );
}
