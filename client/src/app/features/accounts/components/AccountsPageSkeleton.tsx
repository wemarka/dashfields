/**
 * AccountsPageSkeleton — loading skeleton for the Connected Accounts page
 */
export function AccountsPageSkeleton() {
  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Header skeleton */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-52 bg-muted rounded-lg animate-pulse" />
            <div className="h-4 w-80 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-muted rounded-lg animate-pulse" />
            <div className="h-9 w-36 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
        {/* Summary bar skeleton */}
        <div className="flex gap-6">
          <div className="h-4 w-28 bg-muted rounded animate-pulse" />
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        </div>
        {/* Grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-5 w-20 bg-muted rounded-full animate-pulse" />
              </div>
              <div className="flex items-end justify-between">
                <div className="space-y-1">
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                  <div className="h-8 w-24 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-8 w-16 bg-muted rounded-xl animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
