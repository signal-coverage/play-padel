"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useOrganization } from "@/core/organizations/hooks/use-organization";
import { usePermission } from "@/core/permissions/hooks/use-permission";
import { updateOrganizationPlan } from "@/app/actions/organizations";
import { PLAN_VALUES, type Plan } from "@/core/organizations/types";
import { PLAN_LABEL } from "@/core/organizations/consts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PLAN_DESCRIPTIONS } from "./consts";

function PlanPageSkeleton() {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function PlanSettingsPage() {
  const { organization, loading, refetch } = useOrganization();
  const { hasPermission } = usePermission();
  const [switchingTo, setSwitchingTo] = useState<Plan | null>(null);

  if (loading) return <PlanPageSkeleton />;

  if (!hasPermission("organization.update")) {
    return (
      <p className="text-muted-foreground">
        You do not have permission to view this page.
      </p>
    );
  }

  if (!organization) return null;

  async function handleSwitch(plan: Plan) {
    setSwitchingTo(plan);
    const result = await updateOrganizationPlan(plan);
    if (result.success) {
      toast.success(`Switched to the ${PLAN_LABEL[plan]} plan`);
      refetch();
    } else {
      toast.error(result.error ?? "Failed to switch plan");
    }
    setSwitchingTo(null);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Plan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your plan determines which plugins are available to your
          organization.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLAN_VALUES.map((plan) => {
          const isCurrent = organization.plan === plan;
          return (
            <Card
              key={plan}
              className={isCurrent ? "border-primary" : undefined}
            >
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {PLAN_LABEL[plan]}
                  </CardTitle>
                  {isCurrent && <Badge>Current plan</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  {PLAN_DESCRIPTIONS[plan]}
                </p>
                {!isCurrent && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={switchingTo !== null}
                    onClick={() => handleSwitch(plan)}
                  >
                    {switchingTo === plan ? "Switching…" : "Switch to this plan"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
