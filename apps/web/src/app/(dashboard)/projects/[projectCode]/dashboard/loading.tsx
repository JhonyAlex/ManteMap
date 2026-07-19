/**
 * Loading fallback for the project dashboard.
 *
 * Displays skeleton placeholders while the server component fetches metrics.
 *
 * Spec: openspec/changes/phase-9-dashboard-reports/specs/dashboard-reporting/spec.md
 *   "Dashboard UI States" — loading skeleton
 */

import { Skeleton } from '@mantemap/ui';

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Page heading skeleton */}
      <div>
        <Skeleton className="mb-2 h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* KPI grid skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Activity timeline skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-md border p-3">
            <Skeleton className="h-5 w-24" />
            <div className="flex-1">
              <Skeleton className="mb-1 h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>

      {/* Export links skeleton */}
      <div className="flex gap-3">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-36" />
      </div>
    </div>
  );
}
