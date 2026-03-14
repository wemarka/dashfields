/**
 * MarketingDashboard — The marketing overview page.
 * Moved from the old Home page; shows campaign stats, ideas, trends, and creations.
 */
import { useAuth } from "@/shared/hooks/useAuth";
import { ActionableIdeasWidget } from "../home/widgets/ActionableIdeasWidget";
import { TrendingNewsWidget } from "../home/widgets/TrendingNewsWidget";
import { QuickSnapshotWidget } from "../home/widgets/QuickSnapshotWidget";
import { RecentCreationsWidget } from "../home/widgets/RecentCreationsWidget";

export default function MarketingDashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Marketing Overview
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Your campaign performance, insights, and trends at a glance.
        </p>
      </div>

      {/* ── Widget Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left column — 7/12 */}
        <div className="lg:col-span-7 space-y-5">
          <QuickSnapshotWidget />
          <ActionableIdeasWidget />
        </div>

        {/* Right column — 5/12 */}
        <div className="lg:col-span-5 space-y-5">
          <TrendingNewsWidget />
          <RecentCreationsWidget />
        </div>
      </div>
    </div>
  );
}
