"use client";

import { useOrganization } from "@/core/organizations/hooks/use-organization";
import { Skeleton } from "@/components/ui/skeleton";
import { DangerZone } from "../organization/_components/DangerZone/DangerZone";

function DangerZoneSkeleton() {
  return (
    <div className="space-y-2 max-w-2xl">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="border border-destructive/20 rounded-xl divide-y divide-destructive/10">
        <div className="p-4 flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-8 w-20 shrink-0" />
        </div>
        <div className="p-4 flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-80" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-8 w-20 shrink-0" />
        </div>
      </div>
    </div>
  );
}

export default function DangerZonePage() {
  const { organization, userProfile, loading } = useOrganization();

  if (loading) return <DangerZoneSkeleton />;

  if (userProfile?.roleId !== "admin") {
    return (
      <p className="text-muted-foreground">
        You do not have permission to view this page.
      </p>
    );
  }

  if (!organization) return null;

  return (
    <div className="space-y-2">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Danger Zone</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Irreversible actions for your organization. Proceed with caution.
        </p>
      </div>
      <DangerZone organization={organization} />
    </div>
  );
}
