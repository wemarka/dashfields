import { useBackgroundPrefetch } from "@/core/hooks/useBackgroundPrefetch";

export default function Home() {
  // Warm the cache for the most-visited pages 2 seconds after Dashboard loads
  useBackgroundPrefetch();

  return (
    <div className="flex-1 flex items-center justify-center h-full min-h-[60vh]">
      <div className="text-center">
        <p className="text-muted-foreground text-sm">Dashboard</p>
      </div>
    </div>
  );
}
