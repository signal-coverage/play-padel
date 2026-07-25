"use client";

import { useOrganization } from "@/core/organizations/hooks/use-organization";
import { usePermission } from "@/core/permissions/hooks/use-permission";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { OrgSettingsForm } from "./_components/OrgSettingsForm";

function OrgFormSkeleton() {
  return (
    <div className="max-w-2xl space-y-6">
      <Skeleton className="h-8 w-40" />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
          <Skeleton className="h-9 w-28 mt-2" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function OrganizationSettingsPage() {
  const { loading } = useOrganization();
  const { hasPermission } = usePermission();

  if (loading) return <OrgFormSkeleton />;

  if (!hasPermission("organization.read")) {
    return (
      <p className="text-muted-foreground">
        You do not have permission to view this page.
      </p>
    );
  }

  const canEdit = hasPermission("organization.update");

  return <OrgSettingsForm readOnly={!canEdit} />;
}
