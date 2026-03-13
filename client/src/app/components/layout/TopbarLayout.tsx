/**
 * TopbarLayout.tsx — Full-width app shell with sticky GlobalTopbar.
 * Replaces the legacy DashboardLayout (sidebar-based).
 * Auth guard: redirects to /login if not authenticated.
 */
import { useAuth } from "@/shared/hooks/useAuth";
import { GlobalTopbar } from "./GlobalTopbar";

interface TopbarLayoutProps {
  children: React.ReactNode;
}

function TopbarLayoutSkeleton() {
  return (
    <div className="min-h-screen app-bg">
      {/* Topbar skeleton */}
      <div className="h-14 border-b border-white/[0.06] glass-strong flex items-center px-6">
        <div className="w-7 h-7 rounded-lg bg-white/[0.06] shimmer" />
        <div className="ml-3 w-20 h-4 rounded bg-white/[0.06] shimmer" />
        <div className="mx-auto flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-16 h-6 rounded-lg bg-white/[0.06] shimmer" />
          ))}
        </div>
        <div className="w-7 h-7 rounded-full bg-white/[0.06] shimmer" />
      </div>
      {/* Content skeleton */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="w-48 h-7 rounded bg-white/[0.06] shimmer mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-white/[0.06] shimmer" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TopbarLayout({ children }: TopbarLayoutProps) {
  const { isLoading, isAuthenticated } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/login",
  });

  if (isLoading || !isAuthenticated) {
    return <TopbarLayoutSkeleton />;
  }

  return (
    <div className="min-h-screen app-bg">
      <GlobalTopbar />
      <main className="w-full">
        {children}
      </main>
    </div>
  );
}
