/**
 * HomePage — The "Morning Briefing" dashboard.
 * A clean, dark-themed page with modular widget components.
 */
import { useAuth } from "@/shared/hooks/useAuth";
import { ActionableIdeasWidget } from "./widgets/ActionableIdeasWidget";
import { TrendingNewsWidget } from "./widgets/TrendingNewsWidget";
import { QuickSnapshotWidget } from "./widgets/QuickSnapshotWidget";
import { RecentCreationsWidget } from "./widgets/RecentCreationsWidget";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Here is your marketing briefing for today.
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
