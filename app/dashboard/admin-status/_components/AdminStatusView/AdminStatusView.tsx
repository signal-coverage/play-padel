"use client";

import { useSystemStatus } from "./hooks";
import { AdminStatusSummary } from "./components/AdminStatusSummary";
import { AdminStatusRecentActivity } from "./components/AdminStatusRecentActivity";

/**
 * Admin-only observability panel: is each of the app's 3 cron jobs and 2
 * webhook receivers actually running/succeeding? (see
 * app/api/admin/system-status/route.ts and core/systemJobs). Before this
 * page there was zero infrastructure tracking that at all.
 */
export function AdminStatusView() {
  const { data, isLoading, isError } = useSystemStatus();

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          System Status
        </h1>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          Whether each cron job and webhook receiver is actually running and
          succeeding.
        </p>
      </div>

      {isError ? (
        <p className="text-sm text-destructive">
          Could not load system status. Try again later.
        </p>
      ) : (
        <>
          <AdminStatusSummary
            summary={data?.summary ?? {}}
            isLoading={isLoading}
          />

          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Recent activity
            </h2>
            <AdminStatusRecentActivity
              entries={data?.recent ?? []}
              isLoading={isLoading}
            />
          </div>
        </>
      )}
    </div>
  );
}
